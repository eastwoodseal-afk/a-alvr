"use client";
import React from "react";

export default function AboutOverlay({ onClose }: { onClose: () => void }) {
  return (
    // CONTENEDOR: Empieza debajo del Header (top-14), respetando la jerarquía
    <div className="fixed top-14 left-0 right-0 bottom-0 z-[40] bg-gray-950 text-gray-200 flex flex-col overflow-y-auto custom-scrollbar" onClick={onClose}>
      <div className="max-w-3xl w-full mx-auto py-20 px-6 relative" onClick={e => e.stopPropagation()}>
        
        {/* Título Principal */}
        <h1 className="text-3xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
            A'AL VR: La Arquitectura de la Memoria Colectiva
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
                El Problema: El Ruido y el Olvido
            </h2>

            <p>
                Las plataformas actuales están diseñadas para el "ahora", no para el "siempre". El contenido valioso —ese croquis de un maestro moderno, ese detalle constructivo resuelto con maestría, esa edificación olvidada en un rincón de Latinoamérica— se hunde en segundos bajo el peso de los algoritmos que priorizan lo viral sobre lo valioso. El arquitecto, el académico y el estudiante navegan hoy en un océano de imágenes sin brújula, recopilando datos en carpetas dispersas que mueren en discos duros privados. No estamos construyendo un acervo colectivo; estamos acumulando basura digital.
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

            <h2 className="text-2xl font-bold text-white mt-12 mb-4" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                El Poder de la Curaduría
            </h2>

            <p>
                Aquí es donde A'AL VR rompe los esquemas tradicionales. Hemos desarrollado herramientas pensadas específicamente para el crítico, el historiador y el docente.
            </p>

            <p>
                Imaginen poder filtrar la arquitectura de nuestra región no solo por "popularidad", sino por criterios rigurosos. Imaginen un panel de administración que no es un panel de control tecnocrático, sino un <strong>Centro de Curaduría</strong>.
            </p>
            
            <ul className="list-disc pl-6 space-y-4 text-gray-400 mt-4">
                <li><strong className="text-white">Para el Crítico:</strong> La capacidad de revisar, aprobar y categorizar el flujo de entrada. Convertir el caos de la subida masiva en una biblioteca ordenada. Asignar categorías, subcategorías y etiquetas que respondan a líneas de investigación, no a hashtags de moda.</li>
                <li><strong className="text-white">Para el Historiador:</strong> La posibilidad de construir líneas de tiempo, de rescatar obras olvidadas del olvido, de atribuir autorías y contextos que en otras plataformas se pierden.</li>
                <li><strong className="text-white">Para el Docente:</strong> La capacidad de usar el muro principal como una "bitácora de clase", donde los alumnos no solo reciben información, sino que participan en la construcción de su propia referencia visual. El profesor puede guiar la mirada, destacando lo relevante y descartando el ruido.</li>
            </ul>

            <p className="mt-6">
                Esta no es una herramienta pasiva; es un instrumento de trabajo diario. La curaduría en A'AL VR es el acto de construir memoria. El académico deja de ser un espectador para convertirse en el <strong>Director del Museo</strong>, definiendo qué merece ser visto, estudiado y preservado.
            </p>

            <h2 className="text-2xl font-bold text-white mt-12 mb-4" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                La Democratización del Acervo
            </h2>

            <p>
                Pero no todo es académico. La belleza de A'AL VR reside en su capacidad para integrar al usuario común en un entorno de alta exigencia.
            </p>

            <p>
                El usuario "básico" —ese viajero amante de la arquitectura, ese fotógrafo urbano— encuentra aquí un lugar donde sus imágenes tienen peso. Al subir un shot, sabe que está contribuyendo a algo más grande que su propio perfil. La interfaz de "Guardados" y "Colecciones" permite a cada usuario construir su <strong>acervo personal</strong>, su biblioteca de referencias, disponible siempre, pero enriquecida por el contexto que la comunidad y los curadores aportan.
            </p>

            <p>
                Es la sinergia perfecta: La mirada aguda del experto curando el material vasto que la comunidad aporta.
            </p>

            <h2 className="text-2xl font-bold text-white mt-12 mb-4" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                Objetivos y Mirada al Futuro
            </h2>

            <p>
                Nuestro objetivo no es "enganchar" al usuario con dopamina digital. Nuestro objetivo es <strong className="text-yellow-400">ser útiles</strong>.
            </p>

            <ul className="list-disc pl-6 space-y-4 text-gray-400 mt-4">
                <li><strong className="text-white">Preservar:</strong> Crear un respaldo visual de la arquitectura latinoamericana que resiste el paso del tiempo y los cambios tecnológicos.</li>
                <li><strong className="text-white">Educación:</strong> Ser la herramienta de referencia en las facultades de arquitectura, desplazando la búsqueda desordenada de imágenes por una navegación curada y con sentido.</li>
                <li><strong className="text-white">Comunidad:</strong> Crear una red profesional donde la relación no se base en el seguimiento egoísta, sino en el interés común por el espacio que habitamos.</li>
            </ul>

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

        {/* BOTÓN FINAL: Reducido a py-1.5 */}
        <div className="mt-16 text-center">
            <button onClick={onClose} className="px-8 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition shadow-lg text-sm">
                Volver al Ateneo
            </button>
        </div>

      </div>
    </div>
  );
}