import { Logo1, Logo2, Logo3, Logo4, Logo5 } from './assets/logos.jsx';

function LogoPreview() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Logos Lança Digital - Preview
        </h1>
        
        <div className="grid gap-8">
          {/* Logo 1 */}
          <div className="bg-white p-8 rounded-lg shadow-sm border">
            <h2 className="text-lg font-semibold mb-4 text-gray-700">Logo 1 - Retangular Azul</h2>
            <div className="flex items-center justify-center mb-4">
              <Logo1 />
            </div>
            <div className="flex gap-4 justify-center">
              <div className="bg-gray-900 p-4 rounded">
                <Logo1 />
              </div>
              <div className="bg-blue-600 p-4 rounded">
                <Logo1 />
              </div>
            </div>
          </div>

          {/* Logo 2 */}
          <div className="bg-white p-8 rounded-lg shadow-sm border">
            <h2 className="text-lg font-semibold mb-4 text-gray-700">Logo 2 - Circular com Texto (Recomendado)</h2>
            <div className="flex items-center justify-center mb-4">
              <Logo2 />
            </div>
            <div className="flex gap-4 justify-center">
              <div className="bg-gray-900 p-4 rounded">
                <Logo2 />
              </div>
              <div className="bg-blue-600 p-4 rounded">
                <Logo2 />
              </div>
            </div>
          </div>

          {/* Logo 3 */}
          <div className="bg-white p-8 rounded-lg shadow-sm border">
            <h2 className="text-lg font-semibold mb-4 text-gray-700">Logo 3 - Gradient Pill</h2>
            <div className="flex items-center justify-center mb-4">
              <Logo3 />
            </div>
            <div className="flex gap-4 justify-center">
              <div className="bg-gray-900 p-4 rounded">
                <Logo3 />
              </div>
              <div className="bg-white p-4 rounded border">
                <Logo3 />
              </div>
            </div>
          </div>

          {/* Logo 4 */}
          <div className="bg-white p-8 rounded-lg shadow-sm border">
            <h2 className="text-lg font-semibold mb-4 text-gray-700">Logo 4 - Outline Vertical</h2>
            <div className="flex items-center justify-center mb-4">
              <Logo4 />
            </div>
            <div className="flex gap-4 justify-center">
              <div className="bg-gray-900 p-4 rounded">
                <Logo4 />
              </div>
              <div className="bg-blue-50 p-4 rounded">
                <Logo4 />
              </div>
            </div>
          </div>

          {/* Logo 5 */}
          <div className="bg-white p-8 rounded-lg shadow-sm border">
            <h2 className="text-lg font-semibold mb-4 text-gray-700">Logo 5 - Horizontal com Tagline</h2>
            <div className="flex items-center justify-center mb-4">
              <Logo5 />
            </div>
            <div className="flex gap-4 justify-center">
              <div className="bg-gray-900 p-4 rounded">
                <Logo5 />
              </div>
              <div className="bg-blue-50 p-4 rounded">
                <Logo5 />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-4">
            Cada logo é testado em diferentes fundos. O Logo 2 é recomendado por ser mais versátil.
          </p>
          <button 
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Voltar ao Site Principal
          </button>
        </div>
      </div>
    </div>
  );
}

export default LogoPreview;