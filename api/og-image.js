// API route pour générer l'image Open Graph dynamiquement
export default async function handler(req, res) {
  // HTML template pour l'image OG
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            width: 1200px;
            height: 630px;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            overflow: hidden;
          }
          
          body::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-image: radial-gradient(circle at 2px 2px, rgba(255, 255, 255, 0.05) 1px, transparent 0);
            background-size: 40px 40px;
          }
          
          .orb {
            position: absolute;
            border-radius: 50%;
            filter: blur(80px);
            opacity: 0.3;
          }
          
          .orb-1 {
            width: 400px;
            height: 400px;
            background: linear-gradient(135deg, #f59e0b, #f97316);
            top: -100px;
            right: -100px;
          }
          
          .orb-2 {
            width: 300px;
            height: 300px;
            background: linear-gradient(135deg, #8b5cf6, #6366f1);
            bottom: -50px;
            left: -50px;
          }
          
          .container {
            position: relative;
            z-index: 10;
            text-align: center;
            padding: 60px;
            max-width: 1000px;
          }
          
          .logo {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #f59e0b, #f97316);
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 30px;
            box-shadow: 0 20px 60px rgba(245, 158, 11, 0.4);
          }
          
          h1 {
            font-size: 64px;
            font-weight: 900;
            color: white;
            margin-bottom: 20px;
            letter-spacing: -2px;
            line-height: 1.1;
          }
          
          .gradient-text {
            background: linear-gradient(135deg, #f59e0b, #f97316);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          
          .subtitle {
            font-size: 26px;
            color: #cbd5e1;
            font-weight: 600;
            margin-bottom: 40px;
            line-height: 1.4;
          }
          
          .features {
            display: flex;
            gap: 20px;
            justify-content: center;
            flex-wrap: wrap;
          }
          
          .feature {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            padding: 12px 24px;
            border-radius: 15px;
            font-size: 16px;
            color: white;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="orb orb-1"></div>
        <div class="orb orb-2"></div>
        
        <div class="container">
          <div class="logo">
            <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
          </div>
          
          <h1>
            GRANDSON<br/>
            <span class="gradient-text">Web Analytics</span>
          </h1>
          
          <p class="subtitle">
            Analysez l'ADN de votre site web en quelques secondes
          </p>
          
          <div class="features">
            <div class="feature">🔒 Sécurité Avancée</div>
            <div class="feature">⚡ Performance</div>
            <div class="feature">💻 Technologies</div>
            <div class="feature">💰 Estimation Prix</div>
          </div>
        </div>
      </body>
    </html>
  `;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}
