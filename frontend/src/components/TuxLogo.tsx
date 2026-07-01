export default function TuxLogo({ size = 40 }: { size?: number }) {
  return (
    <img
      src="/dashboard_main.png"
      alt="Ubuntu Localization"
      width={size}
      height={size}
      className="rounded-lg"
    />
  )
}
