import React from 'react';
import LegalPage from '../components/LegalPage';

const EMAIL = 'Joshea2090@gmail.com';
const Mail = () => <a href={`mailto:${EMAIL}`} data-testid="legal-email-link" className="text-[#a8aeff] hover:text-white underline underline-offset-2">{EMAIL}</a>;
const UL = ({ items }) => <ul className="list-disc pl-5 space-y-1">{items.map((t) => <li key={t}>{t}</li>)}</ul>;

const PAGES = {
  about: {
    title: 'About OllieStreamy',
    intro: 'OllieStreamy is a free directory and player that helps you find movies, TV shows and live TV channels in one tidy place.',
    sections: [
      { h: 'What we are', body: <p>OllieStreamy is an index. We organise publicly available information and players so you can browse, search and press play without hunting across dozens of sites.</p> },
      { h: 'Where the information comes from', body: <p>Titles, posters, ratings and descriptions come from The Movie Database (TMDB). OllieStreamy uses the TMDB API but is not endorsed or certified by TMDB.</p> },
      { h: 'Live TV', body: <p>Live channels are collected from public IPTV lists (such as the community-maintained iptv-org project). We check each stream regularly and hide ones that stop working.</p> },
      { h: 'What we do not do', body: <p>We do not host, upload or store any video files. Playback is handled by third-party players and broadcasters.</p> },
    ],
  },
  contact: {
    title: 'Contact',
    intro: 'Got a question, an idea or a problem? We would like to hear from you.',
    sections: [
      { h: 'Email', body: <p>Write to us at <Mail />.</p> },
      { h: 'What to contact us about', body: <UL items={['A channel or title that is broken or mislabelled', 'Feature ideas and feedback', 'Privacy questions', 'Copyright or takedown requests (see our DMCA page)']} /> },
      { h: 'Reply time', body: <p>We usually reply within a few days.</p> },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    intro: 'We keep data collection to the minimum needed to run the site.',
    sections: [
      { h: 'Data stored in your browser', body: <p>Your watch history, favourites, recently watched channels and settings are saved locally in your browser (localStorage). They are not sent to our servers.</p> },
      { h: 'Server logs', body: <p>Like most websites, our servers keep basic technical logs (such as IP address, browser type and requested pages) for security and troubleshooting. Logs are kept for a limited time.</p> },
      { h: 'No selling of data', body: <p>We do not sell, rent or trade your personal information.</p> },
      { h: 'Third-party players and embeds', body: <p>Videos and live streams are played through third-party players and services. They may set their own cookies or collect data under their own privacy policies, which we do not control.</p> },
      { h: 'Clearing your data', body: <p>You can remove everything stored locally at any time by clearing this site's data in your browser settings, or by using "Clear History" on the Watch History page.</p> },
      { h: 'Contact', body: <p>Privacy questions: <Mail />.</p> },
    ],
  },
  terms: {
    title: 'Terms of Use',
    intro: 'By using OllieStreamy you agree to these terms.',
    sections: [
      { h: 'Use at your own risk', body: <p>The site is provided "as is", without warranties of any kind.</p> },
      { h: 'Content', body: <p>We do not host or upload any video files. We only link to or embed content provided by third parties, and we are not responsible for that content.</p> },
      { h: 'Availability', body: <p>Channels, titles and players can change or stop working at any time. We do not guarantee that any content will be available.</p> },
      { h: 'Your responsibility', body: <p>You must follow the laws that apply where you live when using this site.</p> },
      { h: 'Changes', body: <p>We may update these terms from time to time. The date at the top of this page shows the latest version.</p> },
      { h: 'Contact', body: <p>Questions about these terms: <Mail />.</p> },
    ],
  },
  dmca: {
    title: 'DMCA / Takedown',
    intro: 'We respect the rights of creators. If you believe something on OllieStreamy infringes your copyright, you can ask us to remove it.',
    sections: [
      { h: 'How to send a notice', body: <p>Email <Mail /> and include:</p> },
      { h: 'What your notice must include', body: <UL items={['Identification of the copyrighted work', 'The exact URL(s) on OllieStreamy where it appears', 'Your name, address, phone number and email', 'A statement that you have a good-faith belief the use is not authorised by the owner, its agent or the law', 'A statement that the information in your notice is accurate and that you are the owner or authorised to act on their behalf']} /> },
      { h: 'What happens next', body: <p>We review valid notices promptly and remove or disable the link to the material in question.</p> },
    ],
  },
};

export default function LegalPages({ slug }) {
  return <LegalPage slug={slug} {...PAGES[slug]} />;
}
