import { useNavigate } from "react-router-dom"
import { Button } from "../components/ui/button"
import { Search, Briefcase, TrendingUp, Users, ShieldCheck } from "lucide-react"

const Home = () => {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col min-h-[80vh]">
      {/* --- Hero Section --- */}
      <section className="py-20 px-4 text-center bg-linear-to-b from-blue-50/50 to-white">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900 mb-6">
            Find your next <span className="text-blue-600">dream job</span> today
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Thousands of jobs from top companies are waiting for you. 
            Join our community and take the next step in your professional journey.
          </p>

          {/* Large CTA Button */}
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button 
              size="lg" 
              className="text-lg px-8 py-7 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200"
              onClick={() => navigate("/jobs")}
            >
              <Search className="mr-2 h-5 w-5" /> Browse All Jobs
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-8 py-7"
              onClick={() => navigate("/register")}
            >
              Post a Job
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm text-gray-500 font-medium">
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-green-500 h-5 w-5" /> Verified Employers
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="text-blue-500 h-5 w-5" /> Daily Updates
            </div>
            <div className="flex items-center gap-2">
              <Users className="text-purple-500 h-5 w-5" /> 10k+ Active Seekers
            </div>
          </div>
        </div>
      </section>

      {/* --- Popular Categories (Visual Only) --- */}
      <section className="py-16 container mx-auto px-4">
        <h2 className="text-2xl font-bold text-center mb-10">Popular Categories</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {["Software", "Marketing", "Design", "Finance"].map((cat) => (
            <div 
              key={cat}
              onClick={() => navigate("/jobs")}
              className="p-6 border rounded-xl hover:border-blue-500 hover:bg-blue-50/30 transition-all cursor-pointer group text-center"
            >
              <Briefcase className="mx-auto mb-3 h-8 w-8 text-gray-400 group-hover:text-blue-600" />
              <p className="font-semibold text-gray-800">{cat}</p>
            </div>
          ))}
        </div>
      </section>

      {/* --- How it Works Section --- */}
      <section className="py-20 bg-gray-50 border-y">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How Jobify works</h2>
            <p className="text-gray-600">Your journey to a new career in three simple steps</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 text-center">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">1</div>
              <h3 className="text-xl font-bold">Create an account</h3>
              <p className="text-gray-600">Sign up as a seeker or employer to get started with your profile.</p>
            </div>
            <div className="space-y-4">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">2</div>
              <h3 className="text-xl font-bold">Search and apply</h3>
              <p className="text-gray-600">Browse thousands of listings and apply with your professional profile.</p>
            </div>
            <div className="space-y-4">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">3</div>
              <h3 className="text-xl font-bold">Get Hired</h3>
              <p className="text-gray-600">Connect with top employers and land your next big opportunity.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home