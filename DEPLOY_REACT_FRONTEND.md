# 🚀 Deploy ARAGOG to Hugging Face Spaces

## Full-Stack Deployment with React Frontend + FastAPI Backend

This guide shows you how to deploy your complete ARAGOG application to Hugging Face Spaces using Docker.

---

## 📋 Prerequisites

1. ✅ **Hugging Face Account** - [Sign up free](https://huggingface.co/join)
2. ✅ **Git installed** - Check: `git --version`
3. ✅ **Git LFS installed** - [Download here](https://git-lfs.github.com/)

---

## 🎯 **Docker Space Deployment (Recommended)**

**Deploy BOTH your React frontend AND FastAPI backend together!**

### ✅ What I've Already Done:

1. ✅ **Updated Dockerfile** - Builds React + serves via FastAPI
2. ✅ **Updated backend/main.py** - Now serves React frontend
3. ✅ **Configured port 7860** - For Hugging Face Spaces

### 📝 **Steps to Deploy:**

#### **Step 1: Update Frontend API URL**

Edit `frontend/src/services/aragog.ts` (or wherever you make API calls):

```typescript
// Change this:
const API_URL = "http://localhost:8000/api";

// To this (for production):
const API_URL = window.location.origin + "/api";
// This makes it work both locally and on Hugging Face!
```

#### **Step 2: Build Frontend Locally (Test)**

```powershell
cd frontend
npm install
npm run build
# This creates frontend/dist folder
```

#### **Step 3: Test Full Stack Locally**

```powershell
cd ..
docker-compose up --build
# Visit: http://localhost:8000
# You should see your React app!
```

#### **Step 4: Deploy to Hugging Face**

```powershell
# 1. Create Space on Hugging Face
#    - Go to: https://huggingface.co/new-space
#    - Name: aragog-medical-ai
#    - SDK: Docker
#    - Hardware: CPU (free)

# 2. Initialize Git (if not done)
git init
git lfs install
git lfs track "*.pt" "*.faiss" "*.bin"

# 3. Add remote
git remote add hf https://huggingface.co/spaces/YOUR_USERNAME/aragog-medical-ai

# 4. Copy updated README
Copy-Item README_DOCKER.md README.md -Force

# 5. Commit and push
git add .
git commit -m "Deploy full-stack ARAGOG with React frontend"
git push hf main
```

**Done! Your React app + backend will be live in 10-15 minutes!** 🚀

---

## 📋 **Quick Checklist:**

- [ ] Update API URLs in frontend code
- [ ] Build frontend locally and test
- [ ] Create Hugging Face Space (Docker SDK)
- [ ] Configure Git LFS for model files
- [ ] Push to Hugging Face
- [ ] Wait for build (10-15 min)
- [ ] Test your live app!

---

## 🔧 **Files Modified:**

1. ✅ **Dockerfile** - Builds React + serves via FastAPI
2. ✅ **backend/main.py** - Serves React frontend
3. ✅ **README_DOCKER.md** - Updated documentation

---

## 💡 **Quick Commands:**

```powershell
# Test locally:
cd "c:\Users\Dell\OneDrive\Desktop\ARAGOG\ARAGOG"
cd frontend && npm run build && cd ..
cd backend && python main.py
# Visit: http://localhost:7860

# Deploy to HF:
git add .
git commit -m "Full stack deployment"
git push hf main
```

---

## 🆘 **Need Help?**

The changes are ready! Just:
1. Update your API URLs in the frontend
2. Build and test locally
3. Push to Hugging Face

**Want me to guide you through step-by-step?** Just ask! 🙋‍♂️
Test Locally (Optional):**

```powershell
# Build frontend
cd frontend
npm install
npm run build

# Start backend (serves frontend)
cd ../backend
python main.py
# Visit: http://localhost:7860
```

---

## ✅ **That's It!**

Your ARAGOG application with React frontend will be live on Hugging Face Spaces!

**Live URL:** `https://huggingface.co/spaces/YOUR_USERNAME/aragog-medical-ai`

---

## 🆘 **Troubleshooting**

**Build fails?**
- Check Git LFS is tracking model files: `git lfs ls-files`
- Ensure all dependencies are in backend/requirements.txt

**Frontend not showing?**
- Verify frontend builds locally: `cd frontend && npm run build`
- Check frontend/dist folder exists after build

**Need help?** Open an issue on the repository or ask in Hugging Face Discord!