import { useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ProfilePictureUploadProps {
  picture?: string;
  onPictureChange: (picture: string) => void;
}

export function ProfilePictureUpload({ picture, onPictureChange }: ProfilePictureUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    setIsLoading(true);

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        onPictureChange(result);
        setIsLoading(false);
      };
      reader.onerror = () => {
        alert('Failed to read image file');
        setIsLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      alert('Failed to process image');
      setIsLoading(false);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <section className="flex flex-col items-center">
      <div className="relative group cursor-pointer" onClick={handleClick}>
        <div
          className={cn(
            'size-32 rounded-full overflow-hidden border-4 border-gray-200 dark:border-surface-border',
            'group-hover:border-primary transition-colors duration-300',
            'bg-gray-100 dark:bg-surface-dark bg-center bg-cover',
            isLoading && 'opacity-50'
          )}
          style={
            picture
              ? { backgroundImage: `url(${picture})` }
              : undefined
          }
        >
          {!picture && (
            <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-surface-dark">
              <Camera className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
          )}
        </div>
        <div className="absolute bottom-0 right-0 bg-primary text-black rounded-full p-2 border-4 border-background-light dark:border-background-dark flex items-center justify-center">
          <Camera className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-3 text-center">
        <p className="text-lg font-bold">Upload Photo</p>
        <p className="text-sm text-slate-500 dark:text-[#90cba8]">Add a profile picture</p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </section>
  );
}

