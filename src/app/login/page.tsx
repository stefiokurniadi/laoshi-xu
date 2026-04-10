import { AuthCard } from "@/components/AuthCard";
import { getGoogleLoginEnabled } from "@/lib/appSettings.server";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage(props: PageProps) {
  const searchParams = (await props.searchParams) ?? {};
  const authError = typeof searchParams.authError === "string" ? searchParams.authError : null;
  const authNotice = typeof searchParams.authNotice === "string" ? searchParams.authNotice : null;
  const resendEmail = typeof searchParams.resendEmail === "string" ? searchParams.resendEmail : null;
  const verifyExpired = searchParams.verifyExpired === "1";
  const showGoogleLogin = await getGoogleLoginEnabled();

  return (
    <main id="main-content" className="flex flex-1 flex-col">
      <div className="flex min-h-[100dvh] w-full flex-1 flex-col items-center justify-center bg-gradient-to-b from-[#f0f6f7] via-[#e4eef0] to-[#d6e6e8] px-6 py-16 sm:py-20">
        <AuthCard
          authError={authError}
          authNotice={authNotice}
          resendEmail={resendEmail}
          verifyExpired={verifyExpired}
          showGoogleLogin={showGoogleLogin}
        />
      </div>
    </main>
  );
}
