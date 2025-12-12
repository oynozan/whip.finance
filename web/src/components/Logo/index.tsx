import Image from "next/image";

type Colors = "dark" | "white";

export default function Logo({ size = 32, color = "white" }: { size?: number; color?: Colors }) {
    return (
        <Image
            src={color === "white" ? "/logo.svg" : `/logo-${color}.svg`}
            alt="elowen.ai Logo"
            width={size}
            height={size}
            quality={100}
        />
    );
}
