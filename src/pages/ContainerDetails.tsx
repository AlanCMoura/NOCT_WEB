import React, { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

interface User {
  name: string;
  role: string;
}

interface ContainerInfo {
  quantidade: string;
  tara: string;
  pesoBruto: string;
  pesoLiquido: string;
  lacreAgencia: string;
  dataRetirada: string;
  lacreOutros: string;
}

const initialInfo: ContainerInfo = {
  quantidade: '540',
  tara: '2220',
  pesoBruto: '27081',
  pesoLiquido: '27000',
  lacreAgencia: 'MQ45314',
  dataRetirada: '2025-07-01',
  lacreOutros: 'Múltiplos lacres'
};

const ContainerDetails: React.FC = () => {
  const { containerId, operationId } = useParams();
  const decodedContainerId = containerId ? decodeURIComponent(containerId) : '';
  const decodedOperationId = operationId ? decodeURIComponent(operationId) : '';
  const navigate = useNavigate();
  const [info, setInfo] = useState<ContainerInfo>(initialInfo);
  const [images, setImages] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length) {
      setImages(prev => [...prev, ...files]);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setImages(prev => [...prev, ...files]);
    }
  };

  const handleImageButtonClick = (): void => {
    fileInputRef.current?.click();
  };

  const handleRemoveImage = (index: number): void => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleCancel = (): void => {
    navigate(-1);
  };

  const handleSave = (): void => {
    alert('Salvar informações em breve!');
  };
  const user: User = {
    name: 'Carlos Oliveira',
    role: 'Administrador'
  };

  const handlePageChange = (pageId: string): void => {
    switch(pageId) {
      case 'dashboard':
        navigate('/dashboard');
        break;
      case 'operations':
        navigate('/operations');
        break;
      case 'usuarios':
        navigate('/users');
        break;
      case 'relatorios':
        navigate('/reports');
        break;
      case 'cadastrar':
        navigate('/register-inspector');
        break;
      case 'logout':
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        break;
      default:
        break;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setInfo(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar currentPage="operations" onPageChange={handlePageChange} user={user} />

      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 h-20">
          <div className="flex items-center justify-between h-full px-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Container {decodedContainerId}</h1>
              <p className="text-sm text-gray-600">Operação {decodedOperationId}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded-lg px-4 py-2 transition-colors">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">{user.name}</div>
                  <div className="text-xs text-gray-500">{user.role}</div>
                </div>
                <div className="w-11 h-11 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-8 space-y-8">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageUpload}
            />

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Dados do Container</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade de Sacaria</label>
                  <input
                    type="text"
                    name="quantidade"
                    value={info.quantidade}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tara (Tons)</label>
                  <input
                    type="text"
                    name="tara"
                    value={info.tara}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Peso Bruto (kg)</label>
                  <input
                    type="text"
                    name="pesoBruto"
                    value={info.pesoBruto}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Peso Líquido (kg)</label>
                  <input
                    type="text"
                    name="pesoLiquido"
                    value={info.pesoLiquido}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>
              </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Lacres</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lacre Agência</label>
                  <input
                    type="text"
                    name="lacreAgencia"
                    value={info.lacreAgencia}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Retirada Terminal</label>
                  <input
                    type="text"
                    name="dataRetirada"
                    value={info.dataRetirada}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div className="md:col-span-2 mb-8">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lacres Outros</label>
                  <input
                    type="text"
                    name="lacreOutros"
                    value={info.lacreOutros}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>
              </section>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 space-y-8 mt-5">
              <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Imagens do Container</h2>
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center"
              >
                {images.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-gray-500">
                    <svg
                      className="w-10 h-10 text-gray-400 mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v13a2 2 0 002 2h14a2 2 0 002-2V7M3 7l9-5 9 5M3 7h18" />
                    </svg>
                    <p className="text-sm">
                      Faça upload das imagens
                      <br />
                      Arraste e solte imagens aqui ou clique para selecionar
                    </p>
                    <button
                      type="button"
                      onClick={handleImageButtonClick}
                      className="mt-4 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Selecionar Imagens
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {images.map((img, idx) => (
                        <div key={idx} className="relative group">
                          <img
                            src={URL.createObjectURL(img)}
                            alt={`Imagem ${idx + 1}`}
                            className="w-full h-32 object-cover rounded-lg border"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="absolute top-1 right-1 bg-white bg-opacity-80 rounded-full p-1 text-xs text-gray-600 hover:bg-red-100 hover:text-red-500"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={handleImageButtonClick}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Adicionar Mais Imagens
                    </button>
                  </div>
                )}
              </div>
            </section>
               <div className="flex justify-end gap-4">
              <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
              type="button"
                onClick={handleSave}
                className="px-4 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600 transition-colors"
              >
                Salvar Container
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ContainerDetails;