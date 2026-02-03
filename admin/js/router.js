// admin/js/router.js
import { renderHome, renderAgenda, renderCaja, renderClientes, renderServiciosConfig } from './ui.js';

export async function router(view) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    
    const targetView = document.getElementById(`view-${view}`);
    if (targetView) targetView.classList.remove('hidden');

    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu) mobileMenu.classList.add('hidden');

    try {
        switch (view) {
            case 'home': await renderHome(); break;
            case 'agenda': await renderAgenda(); break;
            case 'caja': await renderCaja(); break;
            case 'clientes': await renderClientes(); break;
            case 'servicios': await renderServiciosConfig(); break;
        }
    } catch (error) {
        console.error(`Error en vista ${view}:`, error);
    }
}

window.router = router;