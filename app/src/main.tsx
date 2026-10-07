// Point d'entrée : application MJ, ou écran joueurs si l'adresse contient ?ecran=joueurs.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { FournisseurCampagne } from './interface/etat';
import { Coquille } from './interface/Coquille';
import { EcranJoueurs } from './interface/EcranJoueurs';
import './interface/styles.css';

const ecranJoueurs = new URLSearchParams(window.location.search).get('ecran') === 'joueurs';

createRoot(document.getElementById('racine')!).render(
  <StrictMode>
    {ecranJoueurs ? <EcranJoueurs /> : (
      <FournisseurCampagne>
        <Coquille />
      </FournisseurCampagne>
    )}
  </StrictMode>,
);
