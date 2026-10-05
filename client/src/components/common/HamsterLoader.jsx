const sizes = {
  sm: "9px",
  md: "12px",
  lg: "17px",
};

// Kept under the existing component name so every page receives the new loader
// without changing its data-loading behavior.
const HamsterLoader = ({ size = "md", label = "Đang tải" }) => (
  <div
    className="erp-honeycomb-loader"
    role="status"
    aria-label={label}
    style={{ "--honey-size": sizes[size] || sizes.md }}
  >
    <div className="erp-honeycomb" aria-hidden="true">
      {Array.from({ length: 7 }, (_, index) => <i key={index} />)}
    </div>
    <span className="sr-only">{label}</span>
  </div>
);

export default HamsterLoader;
