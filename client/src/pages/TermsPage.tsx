import { LegalShell, LegalSection } from "@/components/LegalShell";
import { COMPANY } from "@/lib/company";

export default function TermsPage() {
  return (
    <LegalShell title="Termos de Uso" updated="julho de 2026">
      <p className="text-sm text-muted-foreground leading-relaxed">
        Estes Termos de Uso regem o acesso e a utilização da plataforma {COMPANY.product}, um
        sistema de gestão de pátio de veículos oferecido por {COMPANY.legalName}, inscrita no
        CNPJ {COMPANY.cnpj} ("nós"). Ao criar uma conta ou utilizar o {COMPANY.product}, você
        ("usuário") concorda com estes termos.
      </p>

      <LegalSection title="1. Descrição do serviço">
        <p>
          O {COMPANY.product} é um software como serviço (SaaS) para lojas e pátios de veículos,
          incluindo controle de estoque, vendas, despesas, cadastro de clientes e catálogo público,
          conforme o plano contratado.
        </p>
      </LegalSection>

      <LegalSection title="2. Cadastro e conta">
        <p>
          Para usar o {COMPANY.product} é necessário criar uma conta com informações verdadeiras,
          completas e atualizadas. Você é responsável por manter a confidencialidade das suas
          credenciais e por todas as atividades realizadas na sua conta.
        </p>
      </LegalSection>

      <LegalSection title="3. Planos, assinatura e pagamento">
        <p>
          O {COMPANY.product} é oferecido em planos com um período de teste gratuito. Após o teste,
          a continuidade depende da assinatura de um plano pago, com cobrança mensal recorrente
          processada pelo Asaas. O acesso é liberado após a confirmação do pagamento.
        </p>
        <p>
          A assinatura se renova automaticamente a cada ciclo até que seja cancelada. O não pagamento
          pode resultar na suspensão do acesso. Os dados permanecem guardados durante o período de
          suspensão, conforme a política de retenção.
        </p>
      </LegalSection>

      <LegalSection title="4. Uso aceitável">
        <p>
          É vedado utilizar o {COMPANY.product} para fins ilícitos, inserir dados de terceiros sem
          autorização, tentar burlar mecanismos de segurança, ou de qualquer forma prejudicar o
          funcionamento da plataforma ou de outros usuários.
        </p>
      </LegalSection>

      <LegalSection title="5. Dados e conteúdo do usuário">
        <p>
          Os dados cadastrados por você (veículos, clientes, financeiro etc.) são de sua
          responsabilidade e continuam sendo seus. Concedemos a você o acesso a esses dados enquanto
          a conta estiver ativa. O tratamento de dados pessoais segue a nossa Política de Privacidade.
        </p>
      </LegalSection>

      <LegalSection title="6. Propriedade intelectual">
        <p>
          O software, a marca {COMPANY.product} e todos os elementos da plataforma pertencem a
          {" "}{COMPANY.legalName}. Estes termos não transferem qualquer direito de propriedade
          intelectual ao usuário.
        </p>
      </LegalSection>

      <LegalSection title="7. Disponibilidade e suporte">
        <p>
          Empenhamo-nos para manter o serviço disponível, mas ele pode passar por manutenções e
          interrupções. O suporte é prestado pelos canais indicados na plataforma.
        </p>
      </LegalSection>

      <LegalSection title="8. Limitação de responsabilidade">
        <p>
          O {COMPANY.product} é fornecido "no estado em que se encontra". Na máxima extensão permitida
          pela lei, {COMPANY.legalName} não se responsabiliza por danos indiretos ou lucros cessantes
          decorrentes do uso ou da indisponibilidade do serviço.
        </p>
      </LegalSection>

      <LegalSection title="9. Cancelamento">
        <p>
          Você pode cancelar sua assinatura a qualquer momento; o acesso permanece até o fim do ciclo
          já pago. Podemos suspender ou encerrar contas que violem estes termos.
        </p>
      </LegalSection>

      <LegalSection title="10. Alterações dos termos">
        <p>
          Estes termos podem ser atualizados. Mudanças relevantes serão comunicadas pela plataforma.
          O uso continuado após a atualização representa a concordância com a nova versão.
        </p>
      </LegalSection>

      <LegalSection title="11. Legislação e foro">
        <p>
          Estes termos são regidos pelas leis brasileiras. Fica eleito o foro da comarca de
          Parnaíba-PI para dirimir eventuais controvérsias, salvo disposição legal em contrário.
        </p>
      </LegalSection>

      <LegalSection title="12. Contato">
        <p>
          {COMPANY.legalName} — CNPJ {COMPANY.cnpj}<br />
          {COMPANY.address}<br />
          E-mail: {COMPANY.supportEmail}
        </p>
      </LegalSection>
    </LegalShell>
  );
}
