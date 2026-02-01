# Arlington Lakes Golf League

Monday Night Golf League scheduler and management app.

## Deployment Guide (For Beginners)

### Step 1: Download This Folder

Download the entire `arlington-lakes-golf-league` folder to your computer (e.g., to your Desktop or Documents).

---

### Step 2: Create a GitHub Account

1. Go to [github.com](https://github.com)
2. Click **Sign up**
3. Follow the prompts to create your account
4. Verify your email

---

### Step 3: Install GitHub Desktop (Easiest Method)

1. Go to [desktop.github.com](https://desktop.github.com)
2. Download and install GitHub Desktop
3. Open it and sign in with your GitHub account

---

### Step 4: Create a New Repository

1. In GitHub Desktop, click **File > New Repository**
2. Name: `arlington-lakes-golf-league`
3. Description: `Monday Night Golf League App`
4. Local Path: Choose the folder where you downloaded this project
5. Check **Initialize this repository with a README** = NO (we already have one)
6. Click **Create Repository**

---

### Step 5: Add Your Files

1. GitHub Desktop should now show all the files as "changes"
2. In the bottom left, type a commit message: `Initial commit`
3. Click **Commit to main**

---

### Step 6: Publish to GitHub

1. Click **Publish repository** (top right)
2. Uncheck "Keep this code private" if you want it public
3. Click **Publish Repository**

Your code is now on GitHub!

---

### Step 7: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **Sign Up** and choose **Continue with GitHub**
3. Authorize Vercel to access your GitHub
4. Click **Add New Project**
5. Find `arlington-lakes-golf-league` and click **Import**
6. Keep all defaults and click **Deploy**
7. Wait 1-2 minutes for the build

Your site is now live at a URL like: `arlington-lakes-golf-league.vercel.app`

---

### Step 8: Add Your Custom Domain (Optional)

1. In Vercel, go to your project
2. Click **Settings > Domains**
3. Type your domain (e.g., `arlingtonlakesgolf.com`)
4. Click **Add**
5. Vercel will show you DNS records to add at your domain registrar
6. Add the records, wait 5-10 minutes, and you're live!

---

## Making Updates

### Option A: Through Claude

1. Open a new conversation with Claude
2. Share the file you want to update (e.g., `src/App.jsx`)
3. Describe the changes you want
4. Download the updated file
5. Replace the file in your local folder
6. In GitHub Desktop: commit and push (see below)

### Option B: Committing Changes

1. Open GitHub Desktop
2. You'll see your changed files listed
3. Type a commit message (e.g., "Updated player handicaps")
4. Click **Commit to main**
5. Click **Push origin**
6. Vercel automatically redeploys in ~1 minute

---

## Local Development (Optional)

If you want to test changes locally before pushing:

1. Install Node.js from [nodejs.org](https://nodejs.org) (LTS version)
2. Open Terminal/Command Prompt
3. Navigate to the project folder: `cd path/to/arlington-lakes-golf-league`
4. Run: `npm install`
5. Run: `npm run dev`
6. Open `http://localhost:5173` in your browser

---

## Project Structure

```
arlington-lakes-golf-league/
├── src/
│   ├── App.jsx          # Main application (this is where Claude makes changes)
│   ├── main.jsx         # Entry point (don't edit)
│   └── index.css        # Styles (don't edit)
├── public/
│   └── favicon.svg      # Browser tab icon
├── index.html           # HTML template
├── package.json         # Dependencies
├── vite.config.js       # Build config
├── tailwind.config.js   # Tailwind CSS config
└── postcss.config.js    # CSS processing
```

**Main file to edit: `src/App.jsx`** - This contains all the league logic, players, games, etc.

---

## Admin Access

Default admin password: `golf2026`

(You can change this in `src/App.jsx` - search for `ADMIN_PASSWORD`)
