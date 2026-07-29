import AIOrb from "@/components/AIOrb";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import Navbar from "@/components/Navbar";
import StorySection from "@/components/StorySection";

export default function Home() {
  return (
    <main className="overflow-x-hidden bg-black text-white">
      <Navbar />
      <Hero>
        <AIOrb />
      </Hero>
      <StorySection />
      <Footer />
    </main>
  );
}
