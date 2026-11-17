import { LocaleSwitcher } from "@/components/locale-switcher";

type Props = {
  children: React.ReactNode;
};

export default function AuthLayout({ children }: Props) {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex justify-end px-4 py-3">
        <LocaleSwitcher />
      </div>
      {children}
    </div>
  );
}
