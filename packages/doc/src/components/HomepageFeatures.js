import React from 'react';
import clsx from 'clsx';
import styles from './HomepageFeatures.module.css';

const FeatureList = [
  {
    title: 'Easy to Integrate',
    Svg: require('../../static/img/undraw_docusaurus_mountain.svg').default,
    description: (
      <>
        Designed with latest web technologies and with an easy to use API.
        You can integrate it in 5mn.
      </>
    ),
  },
  {
    title: 'Read anything',
    Svg: require('../../static/img/undraw_docusaurus_tree.svg').default,
    description: (
      <>
       The reader is agnostic to the content and thus can read anything you provide
       to him. <code>.epub</code>, <code>.cbz</code>, <code>.txt</code>, are a common example. Read more about it on the <a href="docs/streamer">streamer section</a>
      </>
    ),
  },
  {
    title: 'Light weight',
    Svg: require('../../static/img/undraw_docusaurus_react.svg').default,
    description: (
      <>
        The only external library used is RxJS, everything else is pure
        vanilla code. This ensure both reliable code and fast execution.
      </>
    ),
  },
];

function Feature({Svg, title, description}) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} alt={title} />
      </div>
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
