import { LegalShell, LegalSection } from "@/components/LegalShell";
import { COMPANY } from "@/lib/company";

export default function PrivacyPage() {
  return (
    <LegalShell title="Política de Privacidade" updated="julho de 2026">
      <p className="text-sm text-muted-foreground leading-relaxed">
        Esta Política descreve como o {COMPANY.product}, operado por {COMPANY.legalName}
        {" "}(CNPJ {COMPANY.cnpj}), trata dados pessoais, em conformidade com a Lei Geral de
        Proteção de Dados (LGPD – Lei nº 13.709/2018).
      </p>

      <LegalSection title="1. Controlador dos dados">
        <p>
          O controlador é {COMPANY.legalName}, {COMPANY.address}. Contato para assuntos de
          privacidade: {COMPANY.supportEmail}.
        </p>
      </LegalSection>

      <LegalSection title="2. Dados que coletamos">
        <p>
          Coletamos dados de cadastro (nome, e-mail, telefone, CPF/CNPJ), dados da loja e dados
          operacionais inseridos por você (veículos, clientes, despesas). Também registramos dados
          de uso e de acesso necessários ao funcionamento e à segurança da plataforma.
        </p>
      </LegalSection>

      <LegalSection title="3. Finalidades e bases legais">
        <p>
          Tratamos os dados para: executar o contrato (fornecer o serviço e processar pagamentos),
          cumprir obrigações legais, e por legítimo interesse (segurança, prevenção a fraudes e
          melhoria do produto). Os dados de clientes que você cadastra são tratados por você, sendo
          você o controlador desses dados e o {COMPANY.product} um operador.
        </p>
      </LegalSection>

      <LegalSection title="4. Compartilhamento">
        <p>
          Compartilhamos dados apenas com operadores necessários à prestação do serviço, como o
          provedor de infraestrutura e autenticação (Supabase) e o processador de pagamentos (Asaas),
          e quando exigido por lei ou autoridade competente. Não vendemos dados pessoais.
        </p>
      </LegalSection>

      <LegalSection title="5. Cookies e armazenamento local">
        <p>
          Utilizamos armazenamento no navegador para manter sua sessão autenticada e o funcionamento
          da aplicação. Esses dados são essenciais para o uso da plataforma.
        </p>
      </LegalSection>

      <LegalSection title="6. Retenção">
        <p>
          Mantemos os dados enquanto a conta estiver ativa e pelo período necessário para cumprir
          obrigações legais. Após o encerramento, os dados podem ser eliminados ou anonimizados,
          ressalvadas as hipóteses de guarda obrigatória.
        </p>
      </LegalSection>

      <LegalSection title="7. Segurança">
        <p>
          Adotamos medidas técnicas e organizacionais para proteger os dados, incluindo controle de
          acesso, isolamento por loja (multi-tenant) e transporte criptografado. Nenhum sistema é
          totalmente imune a riscos, mas trabalhamos para mitigá-los.
        </p>
      </LegalSection>

      <LegalSection title="8. Direitos do titular">
        <p>
          Nos termos da LGPD, você pode solicitar confirmação de tratamento, acesso, correção,
          anonimização, portabilidade e eliminação dos seus dados, além de informações sobre
          compartilhamento. Para exercê-los, contate {COMPANY.supportEmail}.
        </p>
      </LegalSection>

      <LegalSection title="9. Alterações desta política">
        <p>
          Esta Política pode ser atualizada. Mudanças relevantes serão comunicadas pela plataforma,
          e a versão vigente estará sempre disponível nesta página.
        </p>
      </LegalSection>

      <LegalSection title="10. Contato">
        <p>
          {COMPANY.legalName} — CNPJ {COMPANY.cnpj}<br />
          {COMPANY.address}<br />
          E-mail: {COMPANY.supportEmail}
        </p>
      </LegalSection>
    </LegalShell>
  );
}
