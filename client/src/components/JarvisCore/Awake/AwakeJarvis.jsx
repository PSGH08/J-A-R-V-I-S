// AwakeJarvis.jsx
import OuterRim from "./OuterRim";
import DOR from "./DOR";
import Clock from "./Clock";
import VolumeBar from "./VolumeBar";
import Core from "./Core";

export default function AwakeJarvis({ volume = 50 }) {
  return (
    <div className="relative h-[520px] w-[520px]">
      <OuterRim />
      <DOR />
      <Clock />
      <VolumeBar volume={volume} />
      <div className="absolute inset-0 flex items-center justify-center">
        <Core />
      </div>
    </div>
  );
}