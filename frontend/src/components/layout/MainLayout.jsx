import Navbar from './Navbar';
import Footer from './Footer';

export default function MainLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#111827] text-[#FAF8F3] flex flex-col justify-between selection:bg-[#C5A46D]/30 selection:text-white">
      <div>
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
}
