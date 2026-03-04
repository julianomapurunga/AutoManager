import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

interface CliArgs {
  version: string;
  title: string;
  notesFile?: string;
  dryRun: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const raw = argv.slice(2);
  const dryRun = raw.includes("--dry-run");
  const args = raw.filter((a) => a !== "--dry-run");

  const [version, title, notesFile] = args;

  if (!version || !title) {
    // eslint-disable-next-line no-console
    console.error(
      "Uso: npm run release -- <versao> \"Titulo do Release\" [caminho/para/notas.txt] [--dry-run]"
    );
    process.exit(1);
  }

  return { version, title, notesFile, dryRun };
}

function generateNotesFile(filePath: string, version: string, title: string): string {
  let gitLog = "";
  try {
    gitLog = execSync('git log -10 --pretty=format:"- %s"', {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    gitLog = "";
  }

  const headerLines = [
    `# Notas da versão ${version}`,
    "",
    `## ${title}`,
    "",
  ];

  const fallbackBody = [
    "- Descreva aqui as principais mudanças desta versão.",
  ].join("\n");

  const body = gitLog && gitLog.trim().length > 0 ? gitLog : fallbackBody;

  const content = `${headerLines.join("\n")}${body}\n`;
  fs.writeFileSync(filePath, content, "utf8");
  return content;
}

function loadChanges(version: string, title: string, notesFile?: string): string[] {
  if (!notesFile) {
    return ["Atualização do sistema sem notas detalhadas fornecidas."];
  }

  const filePath = path.resolve(notesFile);
  let content: string;

  if (!fs.existsExistsSync?.(filePath) && !fs.existsSync(filePath)) {
    // Cria automaticamente o arquivo de notas com base em commits recentes
    content = generateNotesFile(filePath, version, title);
  } else {
    content = fs.readFileSync(filePath, "utf8");
  }

  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

function updateAppVersion(source: string, newVersion: string): string {
  const versionRegex = /export const APP_VERSION\s*=\s*["'`](.*?)["'`];/;

  if (!versionRegex.test(source)) {
    throw new Error("APP_VERSION não encontrado em shared/version.ts");
  }

  return source.replace(
    versionRegex,
    `export const APP_VERSION = "${newVersion}";`
  );
}

function insertChangelogEntry(
  source: string,
  version: string,
  title: string,
  changes: string[]
): string {
  const changelogMarker = "export const CHANGELOG: ChangelogEntry[] = [";
  const idx = source.indexOf(changelogMarker);

  if (idx === -1) {
    throw new Error("Array CHANGELOG não encontrado em shared/version.ts");
  }

  const arrayStart = source.indexOf("[", idx);
  if (arrayStart === -1) {
    throw new Error("Início do array CHANGELOG não encontrado.");
  }

  const before = source.slice(0, arrayStart + 1); // inclui o '['
  const after = source.slice(arrayStart + 1);

  const indent = "  ";
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const changesLines =
    changes.length > 0
      ? changes
          .map((c) => `${indent}    ${JSON.stringify(c)},`)
          .join("\n")
      : `${indent}    "Atualização sem detalhes.",`;

  const entry = [
    "",
    `${indent}{`,
    `${indent}  version: "${version}",`,
    `${indent}  date: "${today}",`,
    `${indent}  title: ${JSON.stringify(title)},`,
    `${indent}  changes: [`,
    changesLines,
    `${indent}  ],`,
    `${indent}},`,
  ].join("\n");

  return before + entry + after;
}

function main() {
  const { version, title, notesFile, dryRun } = parseArgs(process.argv);
  const changes = loadChanges(version, title, notesFile);

  const versionFilePath = path.resolve("shared/version.ts");
  if (!fs.existsSync(versionFilePath)) {
    throw new Error(`Arquivo não encontrado: ${versionFilePath}`);
  }

  const original = fs.readFileSync(versionFilePath, "utf8");

  const withNewVersion = updateAppVersion(original, version);
  const updated = insertChangelogEntry(withNewVersion, version, title, changes);

  if (dryRun) {
    // eslint-disable-next-line no-console
    console.log("=== Prévia de shared/version.ts (somente trechos relevantes) ===");

    const versionLineMatch = updated.match(
      /export const APP_VERSION\s*=\s*["'`](.*?)["'`];/
    );
    if (versionLineMatch) {
      // eslint-disable-next-line no-console
      console.log("\nNova APP_VERSION:");
      // eslint-disable-next-line no-console
      console.log(versionLineMatch[0]);
    }

    const changelogIdx = updated.indexOf("export const CHANGELOG");
    if (changelogIdx !== -1) {
      const preview = updated
        .slice(changelogIdx)
        .split("\n")
        .slice(0, 40)
        .join("\n");
      // eslint-disable-next-line no-console
      console.log("\nPrévia inicial do CHANGELOG:");
      // eslint-disable-next-line no-console
      console.log(preview);
    }

    // eslint-disable-next-line no-console
    console.log("\n(DRY RUN) Nenhuma alteração foi escrita em disco.");
    return;
  }

  fs.writeFileSync(versionFilePath, updated, "utf8");
  // eslint-disable-next-line no-console
  console.log(`Versão ${version} aplicada em shared/version.ts com sucesso.`);
}

main();

