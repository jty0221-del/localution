export default function Loading() {
 return (
 <div className="min-h-screen bg-[#F8FAFB] flex items-center justify-center p-4">
 <div className="w-full max-w-md space-y-4">
 {/* Animated Header Skeleton */}
 <div className="bg-white rounded-2xl p-8 shadow-sm">
 <div className="flex justify-center mb-6">
 <div className="bg-[#E8EAF0] rounded-full w-16 h-16 animate-pulse" />
 </div>

 {/* Title Skeleton */}
 <div className="h-8 bg-[#E8EAF0] rounded-lg mb-4 animate-pulse" />

 {/* Description Skeleton Lines */}
 <div className="space-y-2 mb-8">
 <div className="h-4 bg-[#E8EAF0] rounded w-full animate-pulse" />
 <div className="h-4 bg-[#E8EAF0] rounded w-5/6 animate-pulse" />
 </div>

 {/* Button Skeleton */}
 <div className="h-12 bg-[#3182F6]/10 rounded-lg animate-pulse" />
 </div>

 {/* Additional Content Skeleton */}
 <div className="bg-white rounded-2xl p-6 shadow-sm">
 <div className="space-y-3">
 <div className="h-4 bg-[#E8EAF0] rounded animate-pulse" />
 <div className="h-4 bg-[#E8EAF0] rounded w-4/5 animate-pulse" />
 <div className="h-4 bg-[#E8EAF0] rounded w-3/4 animate-pulse" />
 </div>
 </div>

 {/* Loading Indicator */}
 <div className="flex justify-center pt-4">
 <div className="relative w-8 h-8">
 <div className="absolute inset-0 rounded-full border-2 border-[#E8EAF0]" />
 <div className="absolute inset-0 rounded-full border-2 border-[#3182F6] border-t-transparent animate-spin" />
 </div>
 </div>
 </div>
 </div>
 );
}
