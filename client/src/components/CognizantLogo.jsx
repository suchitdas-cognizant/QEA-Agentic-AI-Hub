// Official Cognizant wordmark. The image lives at /public/cognizant-logo.png.
// On dark surfaces a CSS filter renders it white (see .cz-wordmark rules).
export default function CognizantLogo({ className = '' }) {
  return (
    <img
      src="/cognizant-logo.png"
      alt="Cognizant"
      className={`cz-wordmark ${className}`}
      draggable="false"
    />
  );
}
