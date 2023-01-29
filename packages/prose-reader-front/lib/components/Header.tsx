import styles from './Header.module.css'

console.log(styles)

export const Header = () => (
  <header
    className={styles.header}
    id="header"
  >
    <div style={{
      display: `flex`
    }}>
      <a className={styles.logo} href="/">
        prose
      </a>
      <nav className={styles.nav}>
        <a className="active">Home</a>
        <a>Features</a><a>Pricing</a>
        <a>Testimonial</a>
      </nav>
      <button className="donate__btn css-hmq73n" aria-label="Get Started">Get Started</button>
      <div className="drawer__handler css-vurnku" style={{
        display: `inline-block`
      }}>
        <div className="css-1tzsnjv">
          {/* <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 512 512" height="26px" width="26px" xmlns="http://www.w3.org/2000/svg">
            <path d="M64 384h384v-42.666H64V384zm0-106.666h384v-42.667H64v42.667zM64 128v42.665h384V128H64z"></path>
          </svg> */}
        </div>
      </div>
    </div>
  </header>
)