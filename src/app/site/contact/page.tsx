import type { Metadata } from 'next';
import { Icons } from '@/components/icons';
import { EnTetePage, Section } from '@/features/site/components/elements';
import { AGENCE_SITE, JULIEN, MESSAGES_WHATSAPP, lienWhatsApp } from '@/features/site/contenu';

export const metadata: Metadata = { title: 'Contact et rendez-vous' };

function Carte({
  icone,
  titre,
  children
}: {
  icone: React.ReactNode;
  titre: string;
  children: React.ReactNode;
}) {
  return (
    <div className='bg-pale rounded-2xl p-6'>
      <div className='text-bleu flex items-center gap-2'>
        {icone}
        <h2 className='font-display text-marine text-xl font-bold'>{titre}</h2>
      </div>
      <div className='mt-3 space-y-2'>{children}</div>
    </div>
  );
}

export default function Contact() {
  return (
    <>
      <EnTetePage
        surtitre='Contact'
        titre='Prenons rendez-vous'
        intro='Premier échange, estimation, recherche d’un bien, suivi de votre vente : choisissez le moyen qui vous convient le mieux.'
      />
      <Section>
        <div id='rendez-vous' className='grid scroll-mt-24 gap-5 md:grid-cols-2'>
          <Carte icone={<Icons.calendar className='size-6' />} titre='Prendre rendez-vous'>
            <p className='text-foreground/80'>
              À l’agence, chez vous ou par téléphone : proposez-moi un moment, je vous confirme
              rapidement le créneau. La réservation en ligne arrive bientôt.
            </p>
            <a
              href={lienWhatsApp(MESSAGES_WHATSAPP.rendezVous)}
              target='_blank'
              rel='noopener noreferrer'
              className='bg-bleu inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-white'
            >
              <Icons.calendar className='size-5' /> Demander un rendez-vous
            </a>
          </Carte>
          <Carte icone={<Icons.whatsapp className='size-6' />} titre='WhatsApp'>
            <p className='text-foreground/80'>
              Une question après une visite, une précision sur un bien, la confirmation d’un
              rendez-vous.
            </p>
            <a
              href={lienWhatsApp()}
              target='_blank'
              rel='noopener noreferrer'
              className='bg-whatsapp inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-white'
            >
              <Icons.whatsapp className='size-5' /> Échanger avec Julien sur WhatsApp
            </a>
            <p className='text-muted-foreground text-sm'>
              Réponse aux heures d’ouverture. Merci de ne pas transmettre de documents ou
              d’informations sensibles par WhatsApp.
            </p>
          </Carte>
          <Carte icone={<Icons.phone className='size-6' />} titre='Téléphone'>
            <a href={JULIEN.telephoneLien} className='text-marine block text-2xl font-bold'>
              {JULIEN.telephone}
            </a>
            <p className='text-muted-foreground text-sm'>Agence : {AGENCE_SITE.telephone}</p>
          </Carte>
          <Carte icone={<Icons.linkedin className='size-6' />} titre='LinkedIn'>
            <p className='text-foreground/80'>
              Conseils, marché roannais, rencontres et actualités de l’agence.
            </p>
            <a
              href={JULIEN.linkedin}
              target='_blank'
              rel='noopener noreferrer'
              className='text-bleu inline-flex items-center gap-1 font-semibold hover:underline'
            >
              Voir mon profil LinkedIn <Icons.arrowRight className='size-4' />
            </a>
          </Carte>
          <Carte icone={<Icons.estimation className='size-6' />} titre='Faire estimer mon bien'>
            <p className='text-foreground/80'>
              Indiquez-moi l’adresse et le type de bien, je vous recontacte pour convenir d’une
              visite.
            </p>
            <a
              href={lienWhatsApp(MESSAGES_WHATSAPP.estimation)}
              target='_blank'
              rel='noopener noreferrer'
              className='border-bleu text-bleu inline-flex items-center gap-2 rounded-xl border-2 px-5 py-3 font-semibold'
            >
              Demander une estimation
            </a>
          </Carte>
          <Carte icone={<Icons.mapPin className='size-6' />} titre={AGENCE_SITE.nom}>
            <p className='text-foreground/80'>
              {AGENCE_SITE.adresse}
              <br />
              {AGENCE_SITE.ville}
            </p>
            <p className='text-foreground/80'>{AGENCE_SITE.horaires}</p>
            <a
              href={`mailto:${AGENCE_SITE.email}`}
              className='text-bleu font-semibold hover:underline'
            >
              {AGENCE_SITE.email}
            </a>
          </Carte>
        </div>
      </Section>
    </>
  );
}
