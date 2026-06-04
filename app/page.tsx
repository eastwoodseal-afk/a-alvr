"use client";
import { useRouter } from 'next/navigation';

export default function CoverPage() {
  const router = useRouter();

  const handleEnter = () => {
    router.push('/home');
  };

  return (
    <div 
      className="fixed inset-0 bg-gray-950 flex flex-col items-center justify-center cursor-pointer select-none group"
      onClick={handleEnter}
    >
      {/* Contenedor Central */}
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        
        {/* 1. LOGO A'AL (GRANDE) */}
        <div 
          className="text-[120px] md:text-[200px] font-normal leading-none tracking-tighter transition-transform duration-300 group-hover:scale-105" 
          style={{ fontFamily: "'Times New Roman', Times, serif" }}
        >
          <span className="text-yellow-500">A'AL</span>
        </div>

        {/* 2. TEXTO CENTRAL */}
        <div className="text-center px-4 w-full max-w-[320px] md:max-w-[480px]">
          <div 
            className="text-[14px] md:text-[18px] text-gray-300 tracking-[0.05em] uppercase leading-tight" 
            style={{ fontFamily: "'Times New Roman', Times, serif" }}
          >
            ATENEO D' ARQUITECTURA LATINOAMERICANA
          </div>
          
          {/* Línea divisoria */}
          <div className="w-full h-[1px] bg-gray-800 my-3"></div>
          
          <div 
            className="text-[12px] md:text-[15px] text-gray-600 font-semibold tracking-[0.20em]"
            style={{ fontFamily: "'Times New Roman', Times, serif" }}
          >
            VALOR Y REGISTRO
          </div>
        </div>

        {/* 3. VR (GRANDE) */}
        <div 
          className="text-[120px] md:text-[200px] font-normal leading-none tracking-tighter transition-transform duration-300 group-hover:scale-105" 
          style={{ fontFamily: "'Times New Roman', Times, serif" }}
        >
          <span className="text-gray-600">VR</span>
        </div>

      </div>
      
      {/* Indicador sutil de "Click" */}
      <div className="absolute bottom-10 text-gray-700 text-xs animate-pulse group-hover:text-gray-500 transition">
        Click para entrar
      </div>
    </div>
  );
}