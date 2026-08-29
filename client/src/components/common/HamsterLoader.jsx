const sizes = {
  sm: "h-8 w-8 [--cube-back:-16px] [--cube-depth:16px]",
  md: "h-11 w-11 [--cube-back:-22px] [--cube-depth:22px]",
  lg: "h-16 w-16 [--cube-back:-32px] [--cube-depth:32px]",
};

const HamsterLoader = ({ size = "md", label = "Đang tải" }) => (
  <div
    aria-label={label}
    role="img"
    className={`[perspective:800px] ${sizes[size] || sizes.md}`}
  >
    <div className="relative h-full w-full animate-[cube-loader_2s_ease_infinite] [transform-style:preserve-3d] motion-reduce:animate-none">
      <div className="absolute inset-0 border-2 border-blue-600 bg-blue-600/20 [transform:translateZ(var(--cube-back))_rotateY(180deg)]" />
      <div className="absolute inset-0 border-2 border-blue-600 bg-blue-600/20 [transform:rotateY(-270deg)_translateX(50%)] [transform-origin:top_right]" />
      <div className="absolute inset-0 border-2 border-blue-600 bg-blue-600/20 [transform:rotateY(270deg)_translateX(-50%)] [transform-origin:center_left]" />
      <div className="absolute inset-0 border-2 border-blue-600 bg-blue-600/20 [transform:rotateX(90deg)_translateY(-50%)] [transform-origin:top_center]" />
      <div className="absolute inset-0 border-2 border-blue-600 bg-blue-600/20 [transform:rotateX(-90deg)_translateY(50%)] [transform-origin:bottom_center]" />
      <div className="absolute inset-0 border-2 border-blue-600 bg-blue-600/20 [transform:translateZ(var(--cube-depth))]" />
    </div>
  </div>
);

export default HamsterLoader;
