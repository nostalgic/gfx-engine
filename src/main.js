
import { ShaderScene } from './engine/ShaderScene.js';

const loadingScreen = document.getElementById('loadingScreen');
const canvas = document.getElementById('canvas');

async function boot() {
    try {
        console.log("🚀 Booting Shader Engine...");
        const scene = new ShaderScene();
        setTimeout(() => {
            console.log("✨ Engine Ready");
            if(loadingScreen) {
                loadingScreen.style.opacity = '0';
                setTimeout(() => loadingScreen.remove(), 500);
            }
            if(canvas) canvas.style.display = 'block';
        }, 100);
    } catch (e) {
        console.error("❌ Boot failed:", e);
    }
}
boot();
