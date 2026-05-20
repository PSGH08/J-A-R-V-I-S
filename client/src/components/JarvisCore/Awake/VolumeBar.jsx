// VolumeBar.jsx
export default function VolumeBar({ volume = 68 }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="relative h-[350px] w-[350px] rounded-full">
        {[...Array(100)].map((_, i) => {
          const filled = i < volume;

          return (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 h-[155px] origin-bottom"
              style={{
                transform: `translate(-50%, -100%) rotate(${i * 3.6}deg)`,
              }}
            >
              <div
                className={`mx-auto h-3 w-[1px] ${
                  filled
                    ? "bg-orange-400 shadow-[0_0_6px_rgba(251,146,60,0.8)]"
                    : "bg-orange-400/15"
                }`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}