import { Octokit } from '@octokit/rest';
import * as fs from 'fs';
import * as path from 'path';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

async function getGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

function shouldIgnore(filePath: string): boolean {
  const ignorePatterns = [
    'node_modules', '.git', 'dist', '.DS_Store', 'server/public',
    '.cache', '.config', '.local', '.upm', 'scripts/',
    '.replit', 'replit.nix', 'generated-icon.png',
    '*.tar.gz', '.breakpoints', '.data'
  ];
  
  for (const pattern of ignorePatterns) {
    if (pattern.startsWith('*.')) {
      const ext = pattern.slice(1);
      if (filePath.endsWith(ext)) return true;
    } else if (filePath.includes(pattern)) {
      return true;
    }
  }
  return false;
}

function getAllFiles(dirPath: string, basePath: string = ''): { path: string; fullPath: string }[] {
  const files: { path: string; fullPath: string }[] = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;
    const fullPath = path.join(dirPath, entry.name);
    
    if (shouldIgnore(relativePath)) continue;
    
    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath, relativePath));
    } else if (entry.isFile()) {
      files.push({ path: relativePath, fullPath });
    }
  }
  
  return files;
}

async function waitForRepoReady(octokit: Octokit, owner: string, repo: string, maxRetries = 10) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const { data } = await octokit.repos.get({ owner, repo });
      if (data.size > 0) return;
    } catch {}
    console.log(`Waiting for repository to initialize... (${i + 1}/${maxRetries})`);
    await new Promise(r => setTimeout(r, 2000));
  }
}

async function main() {
  const repoName = 'AutoManager';
  
  console.log('Connecting to GitHub...');
  const octokit = await getGitHubClient();
  
  const { data: user } = await octokit.users.getAuthenticated();
  console.log(`Authenticated as: ${user.login}`);
  
  let needsInit = false;
  try {
    const { data: repo } = await octokit.repos.get({ owner: user.login, repo: repoName });
    console.log(`Repository ${repoName} already exists.`);
    if (repo.size === 0) {
      needsInit = true;
    }
  } catch (e: any) {
    if (e.status === 404) {
      console.log(`Creating repository ${repoName}...`);
      await octokit.repos.createForAuthenticatedUser({
        name: repoName,
        description: 'AutoManager - Sistema de Controle de Pátio de Veículos',
        private: false,
        auto_init: true,
      });
      console.log('Repository created with initial README!');
      needsInit = false;
    } else {
      throw e;
    }
  }
  
  if (needsInit) {
    console.log('Repository is empty, initializing with README...');
    await octokit.repos.createOrUpdateFileContents({
      owner: user.login,
      repo: repoName,
      path: 'README.md',
      message: 'Initial commit',
      content: Buffer.from('# AutoManager\nSistema de Controle de Pátio de Veículos').toString('base64'),
    });
  }
  
  console.log('Waiting for repository to be ready...');
  await waitForRepoReady(octokit, user.login, repoName);
  
  console.log('Collecting project files...');
  const projectDir = process.cwd();
  const files = getAllFiles(projectDir);
  console.log(`Found ${files.length} files to upload.`);
  
  const BATCH_SIZE = 10;
  const tree: any[] = [];
  
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    console.log(`Uploading files ${i + 1}-${Math.min(i + BATCH_SIZE, files.length)} of ${files.length}...`);
    
    const promises = batch.map(async (file) => {
      const content = fs.readFileSync(file.fullPath);
      const isBinary = content.includes(0x00);
      
      const { data: blob } = await octokit.git.createBlob({
        owner: user.login,
        repo: repoName,
        content: isBinary ? content.toString('base64') : content.toString('utf-8'),
        encoding: isBinary ? 'base64' : 'utf-8',
      });
      
      return {
        path: file.path,
        mode: '100644' as const,
        type: 'blob' as const,
        sha: blob.sha,
      };
    });
    
    const results = await Promise.all(promises);
    tree.push(...results);
  }
  
  console.log('Getting current main branch reference...');
  const { data: ref } = await octokit.git.getRef({
    owner: user.login,
    repo: repoName,
    ref: 'heads/main',
  });
  const parentSha = ref.object.sha;
  
  console.log('Creating Git tree...');
  const { data: gitTree } = await octokit.git.createTree({
    owner: user.login,
    repo: repoName,
    base_tree: parentSha,
    tree,
  });
  
  console.log('Creating commit...');
  const { data: commit } = await octokit.git.createCommit({
    owner: user.login,
    repo: repoName,
    message: 'AutoManager - Sistema de Controle de Pátio de Veículos\n\nSistema completo com:\n- Cadastro de veículos e pessoas\n- Controle de despesas por veículo\n- Despesas operacionais da loja\n- Workflow de status de veículos\n- Venda de veículos com preço, comprador e data\n- Relatórios financeiros\n- Dashboard com estatísticas',
    tree: gitTree.sha,
    parents: [parentSha],
  });
  
  console.log('Pushing to main branch...');
  await octokit.git.updateRef({
    owner: user.login,
    repo: repoName,
    ref: 'heads/main',
    sha: commit.sha,
  });
  
  console.log(`\nPronto! Repositório disponível em: https://github.com/${user.login}/${repoName}`);
}

main().catch(console.error);
