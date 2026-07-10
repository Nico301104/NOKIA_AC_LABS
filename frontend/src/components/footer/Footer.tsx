import { NavLink } from 'react-router';
import { useLanguage } from '../../context/LanguageContext';
import './Footer.css';

function Footer() {
  const currentYear = new Date().getFullYear();
  const { t } = useLanguage();

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section about">
          <h2 className="footer-logo">Nokia<span></span></h2>
          <p>{t('footer.slogan')}</p>
        </div>

        <div className="footer-section links">
          <h3>{t('footer.quickLinks')}</h3>
          <ul>
            <li><NavLink to="/games">{t('footer.projects')}</NavLink></li>
            <li><NavLink to="/about">{t('footer.about')}</NavLink></li>
            <li><NavLink to="/privacy/general">{t('footer.privacy')}</NavLink></li>
          </ul>
        </div>

        <div className="footer-section contact">
          <h3>{t('footer.contact')}</h3>
          <p>Email: nokia@gmail.com</p>
          <div className="social-placeholders">
            <span>LinkedIn</span> • <span>Itch.io</span> • <span>Github</span>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        &copy; {currentYear} {t('footer.rights')}
      </div>
    </footer>
  );
}

export default Footer;