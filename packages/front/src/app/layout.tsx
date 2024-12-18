import type { Metadata } from "next"
import "./globals.css"
import { Provider } from "@/components/ui/provider"
import { Dancing_Script, Roboto } from "next/font/google"

const dancingScript = Dancing_Script({
  subsets: ["latin"],
  variable: "--font-dancing-script",
  // weight: ["400"],
})

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal"],
  variable: "--font-roboto",
})

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// })

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// })

export const metadata: Metadata = {
  title: "Prose",
  description: "Next generation reading engine",
  creator: "Maxime Bret",
  keywords: ["prose", "reading", "engine", "library", "next", "generation", "open source", "MIT", "license"],
  openGraph: {
    title: "Prose",
    description: "Next generation reading engine",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${dancingScript.variable} ${roboto.variable}`}>
        <Provider>{children}</Provider>
      </body>
    </html>
  )
}
