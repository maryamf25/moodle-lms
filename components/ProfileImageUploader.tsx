'use client';
import { useState } from 'react';

// Is component ko currentImage (database wali) pass karein
export default function ProfileImageUploader({ currentImage }: { currentImage?: string }) {
    // Agar user ki pehle se image nahi hai to default avatar dikhayen
    const [image, setImage] = useState(currentImage || 'https://via.placeholder.com/150');
    const [uploading, setUploading] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/profile/image', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (data.url) {
                setImage(data.url); // Foran nayi image screen par dikhayen
                alert('Profile picture updated successfully!');
            } else {
                alert(data.error || 'Upload failed');
            }
        } catch (error) {
            alert('Network error while uploading image');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="flex flex-col items-center space-y-4 p-4 border rounded-lg bg-white shrink-0">
            <img
                src={image}
                alt="User Profile"
                className="w-32 h-32 rounded-full object-cover border-4 border-gray-100 shadow-sm"
            />

            <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition-all">
                {uploading ? 'Uploading...' : 'Change Picture'}
                <input
                    type="file"
                    className="hidden"
                    accept="image/png, image/jpeg, image/jpg"
                    onChange={handleFileChange}
                    disabled={uploading}
                />
            </label>
        </div>
    );
}
