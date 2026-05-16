import React from 'react';

export type WeatherEffect = 'rain' | 'snow' | null;

interface WeatherEffectsProps {
  effect: WeatherEffect;
}

const PARTICLE_COUNT = 50;

const WeatherEffects: React.FC<WeatherEffectsProps> = ({ effect }) => {
  if (!effect) return null;

  const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => i);

  return (
    <div className='weather-effects-container' aria-hidden='true'>
      {particles.map((i) => (
        <div
          key={`${effect}-${i}`}
          className={effect === 'rain' ? 'rain-drop' : 'snowflake'}
        />
      ))}
    </div>
  );
};

export default WeatherEffects;
