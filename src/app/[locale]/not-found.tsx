import { getLocale, setRequestLocale } from "next-intl/server";



import { SiteFooter } from "@/components/landing/footer";

import { SiteHeader } from "@/components/layout/site-header";

import { NotFoundView } from "@/components/shared/not-found-view";



export default async function LocaleNotFound() {

  const locale = await getLocale();

  setRequestLocale(locale);



  return (

    <>

      <SiteHeader />

      <NotFoundView />

      <SiteFooter />

    </>

  );

}


