import { type ImageWidget } from "~/types/widgets";
import Image from "~/components/ui/Image";
import PoweredByDeco from "~/components/ui/PoweredByDeco";
import Section from "../../components/ui/Section";

/** @titleBy title */
interface Item {
  title: string;
  href: string;
}

/** @titleBy title */
interface Link extends Item {
  children: Item[];
}

/** @titleBy alt */
interface Social {
  alt?: string;
  href?: string;
  image: ImageWidget;
}

/** @titleBy label */
interface SupportChannel {
  /** @description Ex.: Telefone, E-mail, WhatsApp */
  label: string;
  /** @description Valor exibido. Ex.: 0800 000 0000, sac@loja.com.br */
  value: string;
  /** @description Link opcional. Ex.: tel:08000000000, mailto:sac@loja.com.br */
  href?: string;
}

interface Support {
  /** @description Título do bloco de atendimento */
  title?: string;
  /** @description Horário de atendimento e prazo de resposta */
  description?: string;
  channels?: SupportChannel[];
}

interface Props {
  /** @description Canais de atendimento (SAC) exibidos no rodapé */
  support?: Support;
  links?: Link[];
  social?: Social[];
  paymentMethods?: Social[];
  policies?: Item[];
  logo?: ImageWidget;
  trademark?: string;
}

function Footer({
  support,
  links = [],
  social = [],
  policies = [],
  paymentMethods = [],
  logo,
  trademark,
}: Props) {
  return (
    <footer role="contentinfo" className="mt-10 bg-gray-50 px-8">
      <div className="flex flex-col gap-8 py-10 sm:gap-10 sm:py-14">
        {support && (support.channels?.length || support.description) && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-ink-soft">
              {support.title ?? "Atendimento"}
            </span>
            {support.description && (
              <p className="text-sm text-muted">{support.description}</p>
            )}
            <ul className="flex flex-col gap-2 sm:flex-row sm:gap-6">
              {support.channels?.map(({ label, value, href }) => (
                <li key={label} className="text-sm text-muted">
                  <span className="text-ink-soft">{label}: </span>
                  {href ? (
                    <a className="underline" href={href}>
                      {value}
                    </a>
                  ) : (
                    value
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <ul className="grid grid-flow-row gap-6 sm:grid-flow-col">
          {links.map(({ title, href, children }) => (
            <li key={href} className="flex flex-col gap-4">
              <a className="text-sm font-medium text-ink-soft" href={href}>
                {title}
              </a>
              <ul className="flex flex-col gap-2">
                {children.map(({ title, href }) => (
                  <li key={href}>
                    <a className="text-sm text-muted" href={href}>
                      {title}
                    </a>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>

        <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center sm:gap-12">
          <ul className="flex gap-4">
            {social.map(({ image, href, alt }) => (
              <li key={href}>
                <a href={href}>
                  <Image src={image} alt={alt} loading="lazy" width={20} height={20} />
                </a>
              </li>
            ))}
          </ul>
          <ul className="flex flex-wrap gap-2">
            {paymentMethods.map(({ image, alt }) => (
              <li key={alt} className="frost flex h-8 w-10 items-center justify-center rounded-xs">
                <Image src={image} alt={alt} width={20} height={20} loading="lazy" />
              </li>
            ))}
          </ul>
        </div>

        <hr className="w-full border-gray-200" />

        <div className="grid grid-flow-row gap-8 sm:grid-flow-col">
          <ul className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            {policies.map(({ title, href }) => (
              <li key={href}>
                <a className="text-xs text-muted" href={href}>
                  {title}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex flex-nowrap items-center justify-between gap-4 sm:justify-center">
            {logo && (
              <img loading="lazy" src={logo} alt="Logo" className="h-5 w-auto" />
            )}
            <span className="text-xs text-muted">{trademark}</span>
          </div>

          <div className="flex flex-nowrap items-center justify-center gap-4">
            <span className="text-sm text-muted">Powered by</span>
            <PoweredByDeco />
          </div>
        </div>
      </div>
    </footer>
  );
}

export const LoadingFallback = () => <Section.Placeholder height="380px" />;

export default Footer;

export const eager = true;
export const sync = true;
export const layout = true;
