import { Hero } from "@/components/main/sections/Hero";
import { About } from "@/components/main/sections/About";
import { Numbers } from "@/components/main/sections/Numbers";
import { Facilities } from "@/components/main/sections/Facilities";
import { Projects } from "@/components/main/sections/Projects";
import { Team } from "@/components/main/sections/Team";
import { Contact } from "@/components/main/sections/Contact";

export default function MainPage() {
  return (
    <>
      <Hero />
      <About />
      <Numbers />
      <Facilities />
      <Projects />
      <Team />
      <Contact />
    </>
  );
}
