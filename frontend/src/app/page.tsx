export default function Home() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to Toucann
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Academic challenges and progress tracking platform
        </p>
        <div className="flex justify-center space-x-4">
          <a
            href="/login"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
          >
            Get Started
          </a>
          <a
            href="/student"
            className="inline-block bg-gray-200 text-gray-900 px-6 py-3 rounded-lg font-medium hover:bg-gray-300"
          >
            Student View
          </a>
        </div>
      </div>
    </div>
  );
}
