"use client";
import React from "react";

export default function AboutOverlay({ onClose }: { onClose: () => void }) {
  return (
    // CONTENEDOR: Debajo del Header (top-14)
    <div className="fixed top-14 left-0 right-0 bottom-0 z-[40] bg-gray-950 text-gray-200 flex flex-col overflow-y-auto custom-scrollbar" onClick={onClose}>
      <div className="max-w-3xl w-full mx-auto py-20 px-6 relative" onClick={e => e.stopPropagation()}>
        
        {/* Título Principal */}
        <h1 className="text-3xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
            ATENEO D' ARQUITECTURA LATINOAMERICANA: La Arquitectura de la Memoria Colectiva
        </h1>
        
        <div className="h-1 w-24 bg-yellow-500 mb-8"></div>

        <p className="text-lg text-gray-500 italic mb-10">
            Por: La voz del Ateneo
        </p>

        <div className="space-y-6 text-lg leading-relaxed text-gray-300" style={{ fontFamily: "'Georgia', serif" }}>
            
            <p>
                En la era de la inmediatez digital, donde la imagen arquitectónica se ha convertido en moneda de cambio efímera en el bullicioso mercado de las redes sociales, nos enfrentamos a una crisis silenciosa: la pérdida del contexto. Instagram nos ha enseñado a consumir arquitectura como consumimos comida rápida: rápido, visual, sin rastro de origen ni profundidad teórica. Pinterest nos ha convertido en coleccionistas compulsivos de imágenes huérfanas, desprovistas de autoría, de ubicación y, lo más grave, de pensamiento.
            </p>

            <p>
                Ante este paisaje de ruido y olvido, surge una propuesta que no busca competir con el entretenimiento, sino restaurar la dignidad del registro. Presentamos <strong className="text-yellow-400">A'AL VR (Ateneo d'Arquitectura Latinoamericana)</strong>, una plataforma concebida no como una red social más, sino como un <strong>Archivo Vivo</strong>.
            </p>

            <h2 className="text-2xl font-bold text-white mt-12 mb-4" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                La Propuesta: Valor y Registro
            </h2>

            <p>
                A'AL VR nace con una filosofía clara inscrita en su nombre: <strong className="text-yellow-400">Valor y Registro</strong>.
            </p>

            <p>
                A diferencia de las redes tradicionales, donde el usuario es el centro de atención, aquí el protagonista es el <strong>Shot</strong>. La imagen, el proyecto, la obra. En A'AL VR, cuando un usuario sube una pieza, no busca "likes"; busca pertenencia a un museo digital. El usuario se convierte en un <strong>aportador</strong>. Desde el estudiante que documenta una intervención urbana en su barrio, hasta el estudio consagrado que archiva su obra construida, todos colaboran en la construcción de un patrimonio común.
            </p>

            <p>
                La plataforma introduce una regla de oro: <em>El Shot es propiedad del acervo</em>. Una vez ingresado, forma parte del archivo. El usuario puede "renunciar" a él, pero no borrarlo de la historia. Esto garantiza la permanencia, protegiendo el conocimiento de los caprichos del olvido digital. Estamos hablando de una <strong>Cartografía Arquitectónica de Latinoamérica</strong>, trazada por miles de manos pero curada con precisión académica.
            </p>

            <p className="mt-10 text-xl text-white font-semibold text-center italic border-t border-gray-800 pt-10">
                "A'AL VR es una estación espacial modular, construida para expandirse. Hoy vemos los cimientos, las columnas y los muros de carga. Mañana, veremos cómo los investigadores colgarán sus tesis en estas paredes virtuales, cómo los estudios archivarán su legado y cómo las nuevas generaciones aprenderán a mirar con ojos críticos."
            </p>
            
            <p className="mt-6 text-center text-yellow-500 font-bold text-xl" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                No estamos construyendo otra red social.<br/>Estamos construyendo la memoria de lo que somos.
            </p>
            
            <p className="mt-4 text-center text-gray-500 font-bold tracking-widest text-sm">
                BIENVENIDOS AL ATENEO.
            </p>

        </div>

        <div className="mt-16 text-center">
            <button onClick={onClose} className="px-8 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition shadow-lg text-sm">
                Volver al Ateneo
            </button>
        </div>

      </div>
    </div>
  );
}