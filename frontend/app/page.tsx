import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import PipelineTimeline from "@/components/PipelineTimeline";
import DataSources from "@/components/DataSources";
import FeedbackLoop from "@/components/FeedbackLoop";
import BuiltForReal from "@/components/BuiltForReal";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Nav />
      <main id="main-content">
        <Hero />
        <PipelineTimeline />
        <DataSources />
        <FeedbackLoop />
        <BuiltForReal />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
