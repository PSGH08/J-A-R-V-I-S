import OuterRim from "./OuterRim";
import DOR from "./DOR";
import Clock from "./Clock";
import Core from "./Core";

export default function IdleJarvis() {
  return (
    <div className="relative h-[520px] w-[520px]">
      <OuterRim size={520} />
      <DOR size={520} />
      <Clock />
      <div className="absolute inset-0 flex items-center justify-center">
        <Core />
      </div>
    </div>
  );
}