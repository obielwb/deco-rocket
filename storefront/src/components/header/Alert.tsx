import Slider from "../../components/ui/Slider";
import { useId } from "react";

export interface Props {
  alerts?: string[];
  /**
   * @title Autoplay interval
   * @description time (in seconds) to start the carousel autoplay
   */
  interval?: number;
}

function Alert({ alerts = [], interval = 5 }: Props) {
  const id = useId();

  return (
    <div id={id}>
      <Slider className="carousel carousel-center w-screen gap-6 text-ink-soft">
        {alerts.map((alert, index) => (
          <Slider.Item key={index} index={index} className="carousel-item">
            <span
              className="w-screen px-5 text-center !text-ink [&_*]:!text-ink"
              dangerouslySetInnerHTML={{ __html: alert }}
            />
          </Slider.Item>
        ))}
      </Slider>

      <Slider.JS rootId={id} interval={interval && interval * 1e3} />
    </div>
  );
}

export default Alert;
