import type { ReactElement } from 'react';
import './Project.css';

export default function Project(): ReactElement {
  return (
    <div className='patelproject'>
      <div className='site-shell'>
        <a className='skip-link' href='#main'>
          Skip to content
        </a>

        <header className='site-header'>
          <div className='brand'>Colin Anacleto</div>

          <nav className='site-nav' aria-label='Main navigation'>
            <a href='#home'>Home</a>
            <a href='#about'>About Me</a>
            <a href='#gallery'>Gallery</a>
            <a href='#contact'>Contact</a>
          </nav>
        </header>

        <main id='main'>
          <section id='home' className='page hero-section'>
            <div className='hero-copy'>
              <p className='eyebrow'>WEB DEVELOPMENT INTRO</p>
              <h1>Welcome to My Website</h1>
              <p className='intro-text'>
                Hi, I’m Colin Anacleto, and this is my personal website. I made
                this site to share a little about myself, my interests, and some
                of the things I enjoy doing.
              </p>
              <p className='intro-text'>
                This project includes a home page, an about page, a gallery
                page, and a contact page. Use the navigation bar at the top to
                explore each section.
              </p>
              <a className='primary-button' href='#about'>
                Learn More About Me
              </a>
            </div>

            <div className='hero-image-card'>
              <img
                src='https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80'
                alt='Laptop and workspace setup'
              />
            </div>
          </section>

          <section id='about' className='page content-section'>
            <div className='section-heading'>
              <p className='eyebrow'>PAGE 2</p>
              <h2>About Me</h2>
            </div>

            <div className='about-grid'>
              <div className='about-card'>
                <p>
                  My name is Colin Anacleto, and I am a student who is learning
                  more about technology and web design. I enjoy building
                  projects that let me be creative while also helping me
                  practice new skills.
                </p>
                <p>
                  In school and in my free time, I like things that involve
                  computers, design, and problem solving. I also enjoy gaming.
                </p>
                <p>
                  This website is a simple example of how I can organize
                  information about myself in a way that is easy to read and
                  navigate.
                </p>
              </div>

              <div className='about-card'>
                <h3>My Interests</h3>
                <ul className='interest-list'>
                  <li>Web development</li>
                  <li>Gaming</li>
                  <li>Technology</li>
                </ul>
                <img
                  className='profile-image'
                  src='https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=700&q=80'
                  alt='Portrait'
                />
              </div>
            </div>
          </section>

          <section id='gallery' className='page content-section'>
            <div className='section-heading'>
              <p className='eyebrow'>PAGE 3</p>
              <h2>Gallery / Hobby Page</h2>
              <p className='section-subtext'>
                One hobby I enjoy is technology and gaming. Here are a few
                images related to that interest.
              </p>
            </div>

            <div className='gallery-grid'>
              <article className='gallery-card'>
                <img
                  src='https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=900&q=80'
                  alt='Gaming setup with monitor and keyboard'
                />
                <h3>Gaming Setup</h3>
                <p>
                  I enjoy gaming because it is entertaining and lets me explore
                  strategy, teamwork, and creativity.
                </p>
              </article>

              <article className='gallery-card'>
                <img
                  src='https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80'
                  alt='Close-up of computer hardware and circuits'
                />
                <h3>Technology</h3>
                <p>
                  Technology interests me because it is always changing and
                  gives people new ways to create and communicate.
                </p>
              </article>

              <article className='gallery-card'>
                <img
                  src='https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80'
                  alt='Programming code displayed on a computer screen'
                />
                <h3>Coding</h3>
                <p>
                  Learning about coding helps me understand how websites and
                  apps are built behind the scenes.
                </p>
              </article>
            </div>
          </section>

          <section id='contact' className='page content-section'>
            <div className='section-heading'>
              <p className='eyebrow'>PAGE 4</p>
              <h2>Contact Page</h2>
              <p className='section-subtext'>
                You can use this form layout as your contact section and list
                your school email below.
              </p>
            </div>

            <div className='contact-grid'>
              <div className='contact-card'>
                <h3>Contact Information</h3>
                <p>Email: col060711@gmail.com</p>
                <p>
                  You can also return to the <a href='#home'>Home Page</a> using
                  this link.
                </p>
              </div>

              <form className='contact-form'>
                <label htmlFor='name'>Name</label>
                <input id='name' type='text' placeholder='Colin Anacleto' />

                <label htmlFor='email'>Email</label>
                <input
                  id='email'
                  type='email'
                  placeholder='col060711@gmail.com'
                />

                <label htmlFor='message'>Message</label>
                <textarea
                  id='message'
                  rows={5}
                  placeholder='Write your message'
                ></textarea>

                <button type='submit'>Send Message</button>
              </form>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
