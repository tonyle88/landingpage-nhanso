export default function SurveyLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <link rel="stylesheet" href="/assets/vendor/fonts/fonts.css" />
      {children}
    </>
  );
}
