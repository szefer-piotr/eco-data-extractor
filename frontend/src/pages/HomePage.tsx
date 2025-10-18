import React from 'react';

export const HomePage: React.FC = () => {
  return (
        <div className="container mx-auto p-4">
            <h1 className="text-3xl font-bold">Welcome to EcoData Extractor</h1>
            <p className="mt-4 text-gray-600">
                Extract structured ecological and biological information from unstructured text.
            </p>
        </div>
    );
};