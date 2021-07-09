import React, { useState } from 'react'
import { useHistory } from 'react-router'
import { Link } from 'react-router-dom'

export const Home = () => {
  const [customUrl, setCustomUrl] = useState('')
  const history = useHistory()

  return (
    <div style={{
      height: `100%`,
      overflow: `scroll`
    }}>
      <div style={{
        width: `100%`,
        margin: `auto`,
        maxWidth: 320,
        display: `flex`,
        flexDirection: `column`,
        alignItems: `center`,
        marginTop: 20,
        marginBottom: 20,
      }}>
        <p style={{ alignSelf: 'flex-start' }}>
          <b>LTR</b> = left to right, <b>RTL</b> = right to left
          <br /><b>RFL</b> = fully reflowable
          <br /><b>RFL(P)</b> = partially reflowable
          <br /><b>FXL</b> = fully pre-paginated (fixed layout)
          <br /><b>FXL(P)</b> = partially pre-paginated (fixed layout)
          <br /><b>TXT</b> = .txt file (RFL)
          <br /><b>MEDIA</b> = contains media (audio, video)
        </p>
        <p style={{ width: `100%`, display: `flex` }}>
          <input type="text" placeholder="Paste your link to epub,cbz,txt,..." style={{ flex: 1, marginRight: 10, padding: 5 }} onChange={e => setCustomUrl(e.target.value)} />
          <button onClick={() => {
            customUrl.length > 0 && history.push(`/classic/reader/${btoa(customUrl)}`)
          }}>open</button>
        </p>
        <Row
          style={{ borderTop: `1px solid black`, }}
          url={`${window.location.origin}/epubs/accessible_epub_3.epub`}
          name="accessible_epub_3.epub"
          details="EN - LTR - RFL" />
        <Row
          url={`${window.location.origin}/epubs/sous-le-vent.epub`}
          name="sous-le-vent.epub"
          details="EN - LTR - FXL" />
        <Row
          url={`${window.location.origin}/epubs/moby-dick_txt.txt`}
          name="moby-dick_txt.txt"
          details="EN - LTR - TXT" />
        <Row
          url={`${window.location.origin}/epubs/mymedia_lite.epub`}
          name="mymedia_lite.epub"
          details="JP - RTL - RFL" />
        <Row
          url={`${window.location.origin}/epubs/haruko-html-jpeg.epub`}
          name="haruko-html-jpeg.epub"
          details="JP - RTL - FXL(P)" />
        <Row
          url={`${window.location.origin}/epubs/regime-anticancer-arabic.epub`}
          name="regime-anticancer-arabic.epub"
          details="AR - RTL - RFL" />
        <Row
          url={`${window.location.origin}/epubs/sample.cbz`}
          name="sample.cbz"
          details="EN - LTR - FXL" />
        <Row
          url={`${window.location.origin}/epubs/cc-shared-culture.epub`}
          name="cc-shared-culture.epub"
          details="EN - LTR - MEDIA" />
      </div>
    </div>
  )
}

const Row = ({ name, details, url, style = {} }: { url: string, name: string, details: string, style?: React.CSSProperties }) => {
  const history = useHistory()

  const rowStyle: React.CSSProperties = {
    borderLeft: `1px solid black`,
    borderRight: `1px solid black`,
    borderBottom: `1px solid black`,
    padding: 10,
    width: `100%`,
    display: `flex`,
    justifyContent: `space-between`
  }

  const detailsStyle: React.CSSProperties = {
    fontSize: `80%`,
    fontWeight: `bold`
  }

  const itemStyle: React.CSSProperties = {
    width: `50%`
  }

  return (
    <Link style={{ ...style, ...rowStyle }} to={`/classic/reader/${btoa(url)}`}>
      <div style={itemStyle}>{name}</div>
      <div style={detailsStyle}>{details}</div>
    </Link>
  )
}