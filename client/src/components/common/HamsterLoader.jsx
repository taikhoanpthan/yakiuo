const sizes = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-14 w-14",
};

const HamsterLoader = ({ size = "md", label = "Đang tải" }) => (
  <div
    aria-label={label}
    role="img"
    className={`relative animate-[three-body-spin_2s_linear_infinite] motion-reduce:animate-none ${sizes[size] || sizes.md}`}
  >
    <div className="absolute bottom-[5%] left-0 h-full w-[30%] origin-[50%_85%] rotate-[60deg]">
      <div className="absolute bottom-0 left-0 aspect-square w-full animate-[three-body-wobble-up_0.8s_-0.24s_ease-in-out_infinite] rounded-full bg-violet-600" />
    </div>
    <div className="absolute bottom-[5%] right-0 h-full w-[30%] origin-[50%_85%] -rotate-[60deg]">
      <div className="absolute bottom-0 left-0 aspect-square w-full animate-[three-body-wobble-up_0.8s_-0.12s_ease-in-out_infinite] rounded-full bg-violet-600" />
    </div>
    <div className="absolute -bottom-[5%] left-0 h-full w-[30%] translate-x-[116.666%]">
      <div className="absolute left-0 top-0 aspect-square w-full animate-[three-body-wobble-down_0.8s_ease-in-out_infinite] rounded-full bg-violet-600" />
    </div>
  </div>
);

export default HamsterLoader;
