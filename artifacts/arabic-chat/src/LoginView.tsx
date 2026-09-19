import React, { useState } from 'react';
import { 
  auth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendEmailVerification 
} from './firebase.js';

interface LoginViewProps {
  onLogin: (name: string, email: string, role: string) => void;
}

export default function LoginView({ onLogin }: LoginViewProps) {
  const [view, setView] = useState<'landing' | 'login' | 'signup'>('landing');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('ذكر');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        setError('يرجى تأكيد بريدك الإلكتروني عبر الرابط المرسل إليك أولاً لتنشيط عضويتك.');
        await auth.signOut();
        setLoading(false);
        return;
      }

      const savedName = localStorage.getItem(`user_name_${email}`) || email.split('@')[0];
      
      // تعيين بريدك الإلكتروني كصاحب التطبيق (Admin) بقرار مباشر
      const role = email.toLowerCase() === 'noor.altrak@gmail.com' ? 'admin' : 'member';
      
      onLogin(savedName, email, role);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
      } else {
        setError(err.message || 'حدث خطأ ما، يرجى المحاولة مرة أخرى.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (!username.trim()) {
        setError('يرجى إدخال اسم المستخدم');
        setLoading(false);
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await sendEmailVerification(user);
      
      localStorage.setItem(`user_name_${email}`, username);
      localStorage.setItem(`user_age_${email}`, age);
      localStorage.setItem(`user_gender_${email}`, gender);

      setMessage('تم إنشاء الحساب بنجاح! تم إرسال رسالة لتنشيط عضويتك إلى بريدك الإلكتروني. يرجى تأكيد البريد ثم تسجيل الدخول.');
      await auth.signOut();
      setView('login');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('البريد الإلكتروني مستخدم بالفعل.');
      } else {
        setError(err.message || 'حدث خطأ ما، يرجى المحاولة مرة أخرى.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    const guestId = Math.floor(Math.random() * 10000);
    const guestName = `زائر_${guestId}`;
    const guestEmail = `guest_${guestId}@guest.com`;
    localStorage.setItem('chat_real_email', guestEmail);
    localStorage.setItem('chat_real_username', guestName);
    onLogin(guestName, guestEmail, 'visitor');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0d2327] p-4 text-white relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]"></div>

      {view === 'landing' && (
        <div className="w-full max-w-sm flex flex-col items-center z-10 space-y-6 text-center">
          <div className="w-20 h-20 rounded-full bg-sky-500/30 border border-sky-400 flex items-center justify-center shadow-lg backdrop-blur-sm">
            <svg className="w-10 h-10 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>

          <div>
            <h1 className="text-3xl font-extrabold tracking-wide mb-2 text-white">شات عربي</h1>
            <p className="text-xs text-gray-300 leading-relaxed px-2">
              دردشة عربية للتعارف مع أصدقاء من جميع دول الوطن العربي في محادثات جماعية وخاصة
            </p>
          </div>

          <div className="w-full space-y-3.5 pt-4">
            <button
              onClick={() => alert('ميزة تسجيل الدخول بواسطة تويتر قريباً')}
              className="w-full bg-[#38bdf8] hover:bg-[#0ea5e9] text-white font-medium py-3 rounded-full shadow-md transition flex items-center justify-center gap-2"
            >
              <span>الدخول بواسطة تويتر</span>
            </button>

            <button
              onClick={() => alert('ميزة تسجيل الدخول بواسطة جوجل قريباً')}
              className="w-full bg-white hover:bg-gray-100 text-gray-900 font-medium py-3 rounded-full shadow-md transition flex items-center justify-center gap-2"
            >
              <span className="font-bold text-red-500">G</span>
              <span>الدخول بواسطة جوجل</span>
            </button>

            <button
              onClick={handleGuestLogin}
              className="w-full bg-[#1e293b] hover:bg-[#334155] text-white font-medium py-3 rounded-full shadow-md transition flex items-center justify-center gap-2 border border-gray-700"
            >
              <span>دخول / كضيف</span>
            </button>

            <button
              onClick={() => { setView('login'); setError(''); setMessage(''); }}
              className="w-full bg-[#65a30d] hover:bg-[#4d7c0f] text-white font-medium py-3 rounded-full shadow-md transition flex items-center justify-center gap-2"
            >
              <span>دخول الأعضاء</span>
            </button>

            <button
              onClick={() => { setView('signup'); setError(''); setMessage(''); }}
              className="w-full bg-[#dc2626] hover:bg-[#b91c1c] text-white font-medium py-3 rounded-full shadow-md transition flex items-center justify-center gap-2"
            >
              <span>إنشاء حساب</span>
            </button>
          </div>
        </div>
      )}

      {view === 'login' && (
        <div className="bg-white text-gray-900 p-8 rounded-3xl w-full max-w-md shadow-2xl z-10 relative">
          <button 
            onClick={() => setView('landing')}
            className="absolute top-4 left-4 text-gray-400 hover:text-gray-700 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full bg-gray-100"
          >
            ✕
          </button>

          <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
            تسجيل دخول الأعضاء
          </h2>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 p-3 rounded-lg mb-4 text-sm text-center">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-green-100 border border-green-400 text-green-700 p-3 rounded-lg mb-4 text-sm text-center">
              {message}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:border-sky-500"
                placeholder="name@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:border-sky-500"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sky-500 hover:bg-sky-600 transition text-white font-medium py-3 rounded-xl shadow-md disabled:opacity-50"
            >
              {loading ? 'جاري تسجيل الدخول...' : 'دخول'}
            </button>
          </form>
        </div>
      )}

      {view === 'signup' && (
        <div className="bg-white text-gray-900 p-6 rounded-3xl w-full max-w-md shadow-2xl z-10 relative">
          <button 
            onClick={() => setView('landing')}
            className="absolute top-4 left-4 text-gray-400 hover:text-gray-700 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full bg-gray-100"
          >
            ✕
          </button>

          <h2 className="text-xl font-bold text-center mb-6 text-gray-900">
            تسجيل الأعضاء الجدد
          </h2>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 p-3 rounded-lg mb-4 text-sm text-center">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-green-100 border border-green-400 text-green-700 p-3 rounded-lg mb-4 text-sm text-center">
              {message}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-3.5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">اسم المستخدم</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-gray-900 focus:outline-none focus:border-sky-500"
                placeholder="اسم المستخدم"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-gray-900 focus:outline-none focus:border-sky-500"
                placeholder="••••••••"
                required
              />
              <p className="text-xs text-red-500 mt-1">تنبيه هام: يُرجى إنشاء كلمة سر قوية لمزيد من أمان حسابك.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-gray-900 focus:outline-none focus:border-sky-500"
                placeholder="name@example.com"
                required
              />
              <p className="text-xs text-red-500 mt-1">تنبيه هام: سوف يصلك رسالة لتنشيط عضويتك لذلك يجب عليك إدخال بريد إلكتروني صحيح.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">العمر</label>
                <select
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-gray-900 focus:outline-none focus:border-sky-500"
                  required
                >
                  <option value="">العمر</option>
                  {Array.from({ length: 80 }, (_, i) => i + 15).map((num) => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الجنس</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-gray-900 focus:outline-none focus:border-sky-500"
                >
                  <option value="ذكر">ذكر</option>
                  <option value="أنثى">أنثى</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0284c7] hover:bg-[#0369a1] transition text-white font-medium py-3 rounded-xl shadow-md disabled:opacity-50 mt-3"
            >
              {loading ? 'جاري التسجيل...' : 'إنشاء حساب'}
            </button>
          </form>

          <div className="mt-3 text-center text-xs text-gray-500">
            بتسجيلك أنت توافق على <span className="text-sky-600 underline cursor-pointer">شروط الاستخدام</span>
          </div>
        </div>
      )}
    </div>
  );
}
