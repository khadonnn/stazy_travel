"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const footerLinkClass =
  "text-gray-400 transition-colors duration-200 hover:text-white";

const Footer = () => {
  const pathname = usePathname();

  const shouldHide =
    pathname?.startsWith("/search-service") ||
    pathname?.startsWith("/full-screen") ||
    pathname?.startsWith("/chat");

  if (shouldHide) return null;

  return (
    <footer className="relative overflow-hidden bg-gray-800">
      {/* SVG Wave Background */}
      <div
        className="
          absolute inset-0
          bg-[url('/assets/svg/wave.svg')]
          bg-no-repeat
          bg-top
          bg-cover
          opacity-20
          pointer-events-none
        "
        aria-hidden="true"
      />

      {/* Content */}
      <div
        className="
          relative z-10
          mx-auto
          max-w-7xl
          px-4 py-10
          md:px-8 md:py-12
        "
      >
        <div
          className="
            grid gap-10
            md:grid-cols-2
            lg:grid-cols-4
          "
        >
          {/* Logo */}
          <div className="space-y-4 flex flex-col justify-between">
            <Link href="/" className="group inline-flex items-center gap-3">
              <Image
                src="/assets/logo.png"
                alt="logo"
                width={40}
                height={40}
                className="
                  rounded-full
                  object-cover
                  box-content
                  transition-transform duration-300
                  group-hover:scale-[1.03]
                "
                style={{ boxShadow: "0 0 0 1px white" }}
              />

              <span className="text-md font-medium tracking-wider text-white">
                Stazy.
              </span>
            </Link>

            <p className="max-w-xs text-sm leading-relaxed text-gray-400">
              Discover beautiful stays and unique hotel experiences around the
              world.
            </p>

            <p className="text-xs text-gray-500">© 2026 The Stazy Booking</p>
          </div>

          {/* Links */}
          <div className="space-y-4">
            <p className="text-sm font-medium text-amber-50">Links</p>

            <div className="flex flex-col gap-3 text-sm">
              <Link href="/" className={footerLinkClass}>
                Homepage
              </Link>

              <Link href="/contact" className={footerLinkClass}>
                Contact
              </Link>

              <Link href="/terms" className={footerLinkClass}>
                Terms of Service
              </Link>

              <Link href="/privacy" className={footerLinkClass}>
                Privacy Policy
              </Link>
            </div>
          </div>

          {/* Hotels */}
          <div className="space-y-4">
            <p className="text-sm font-medium text-amber-50">Hotels</p>

            <div className="flex flex-col gap-3 text-sm">
              <Link href="/hotels" className={footerLinkClass}>
                All hotels
              </Link>

              <Link href="/hotels" className={footerLinkClass}>
                New hotels
              </Link>

              <Link href="/hotels" className={footerLinkClass}>
                Trend hotels
              </Link>

              <Link href="/hotels" className={footerLinkClass}>
                Popular hotels
              </Link>
            </div>
          </div>

          {/* Info */}
          <div className="space-y-4">
            <p className="text-sm font-medium text-amber-50">Info</p>

            <div className="flex flex-col gap-3 text-sm">
              <Link href="/" className={footerLinkClass}>
                About
              </Link>

              <Link href="/" className={footerLinkClass}>
                Contact
              </Link>

              <Link href="/" className={footerLinkClass}>
                Blog
              </Link>

              <Link href="/" className={footerLinkClass}>
                Hosts
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
