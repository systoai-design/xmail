import { useEffect, useRef } from "react";
import { useWallet } from "@/hooks/useWallet";
import { openConnect } from "@/lib/events";
import { useNavigate } from "react-router-dom";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Hero } from "@/components/site/Hero";
import { EncryptionLayers } from "@/components/site/EncryptionLayers";
import { LiveChainProof } from "@/components/site/LiveChainProof";
import { PrivacyPromise } from "@/components/site/PrivacyPromise";
import { Features } from "@/components/site/Features";
import { CallToAction } from "@/components/site/CallToAction";
import { Stats } from "@/components/site/Stats";
import { Pricing } from "@/components/site/Pricing";
import { Faq } from "@/components/site/Faq";
import { SiteFooter } from "@/components/site/SiteFooter";
const Landing = () => {
  const { connected } = useWallet();
  const navigate = useNavigate();
  // Read once, at mount. The previous version read this flag inside the same
  // effect that performed the redirect, and cleared it there too -- so arriving
  // from the inbox suppressed the redirect, wiped the flag, and then never
  // re-ran (deps are [connected, navigate], neither of which changes after).
  // A connected user was stranded here until a full reload.
  const arrivedFromInbox = useRef(sessionStorage.getItem("fromInbox") === "true");
  const userAskedToEnter = useRef(false);

  useEffect(() => {
    sessionStorage.removeItem("fromInbox");
  }, []);

  useEffect(() => {
    // Auto-redirect a connected visitor, unless they deliberately navigated
    // back here from the inbox -- in which case only an explicit click moves.
    if (connected && (userAskedToEnter.current || !arrivedFromInbox.current)) {
      navigate("/inbox");
    }
  }, [connected, navigate]);

  // A CTA has to do the thing it promises. Opening a "connect a wallet" modal
  // to someone whose wallet is already connected is a dead end: `connected`
  // never changes, so nothing downstream ever fires.
  const openWallet = () => {
    userAskedToEnter.current = true;
    if (connected) {
      navigate("/inbox");
    } else {
      openConnect();
    }
  };
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader onConnect={openWallet} />
      <main>
        <Hero onConnect={openWallet} />
        <Stats />
        <div id="layers">
          <EncryptionLayers />
        </div>
        <LiveChainProof />
        <PrivacyPromise />
        <Features />
        <Pricing onConnect={openWallet} />
        <Faq />
        <CallToAction onConnect={openWallet} />
      </main>
      <SiteFooter />
    </div>
  );
};
export default Landing;
