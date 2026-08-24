import { cn } from "@/lib/utils";

type UserAvatarProps = {
  src?: string | null;
  fullName?: string | null;
  email?: string | null;
  className?: string;
  imageClassName?: string;
};

export function getUserInitials(fullName?: string | null, email?: string | null) {
  const source = fullName?.trim() || email?.split("@")[0] || "FelixHub";
  return (
    source
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "FH"
  );
}

export function UserAvatar({
  src,
  fullName,
  email,
  className,
  imageClassName,
}: UserAvatarProps) {
  const initials = getUserInitials(fullName, email);

  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden bg-blue-600 font-bold text-white",
        className,
      )}
      aria-label={fullName ? `Avatar de ${fullName}` : "Avatar do usuário"}
      role="img"
    >
      {src ? (
        // A origem é o bucket público de avatars configurado pelo projeto.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className={cn("absolute inset-0 h-full w-full object-cover", imageClassName)}
        />
      ) : (
        initials
      )}
    </span>
  );
}
