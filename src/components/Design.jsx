import { dateTime, shortId } from '../format';

// One design: the photo before and after, and a few facts.
export default function Design({ project, onOpenUser, children }) {
  const rating = project.rating === 'up' ? '👍' : project.rating === 'down' ? '👎' : '';
  return (
    <div className="design">
      <div className="pair">
        <div className="pic">
          {project.inputUri ? <img src={project.inputUri} alt="Before" loading="lazy" /> : null}
          <span className="tag">BEFORE</span>
        </div>
        <div className="pic">
          {project.outputUri ? <img src={project.outputUri} alt="After" loading="lazy" /> : null}
          <span className="tag">AFTER</span>
        </div>
      </div>
      <div className="info">
        <div className="row">
          <strong>
            {project.name} · {project.styleId ?? '—'}
          </strong>
          <span>{rating}</span>
        </div>
        <div className="row muted">
          <span>{dateTime(project.createdAt)}</span>
          {onOpenUser ? (
            <button className="ghost mono" style={{ height: 24, padding: '0 8px' }} onClick={() => onOpenUser(project.uid)}>
              {shortId(project.uid)}
            </button>
          ) : null}
        </div>
        <div className="row muted">
          <span>{project.palette ? 'colors: ' + project.palette : ''}</span>
          <span>{project.products ? project.products + ' products' : 'no products'}</span>
        </div>
        {project.notes ? <div className="note">{project.notes}</div> : null}
        {children}
      </div>
    </div>
  );
}
