import React from 'react';

/**
 * ============================================================================
 * REDESIGNED CARD GRID COMPONENT
 * ============================================================================
 * Modern, responsive grid layout for card-based interfaces
 * with smooth animations and professional styling
 */

const CardGrid = ({
  data = [],
  renderCard,
  columns = { sm: 1, md: 2, lg: 3 },
  gap = 6,
  onCardClick,
}) => {
  const handleCardClick = (item) => {
    if (onCardClick && typeof onCardClick === 'function') {
      onCardClick(item);
    }
  };

  const getGridClasses = () => {
    const colClasses = ['grid-cols-1'];

    if (columns.sm) colClasses.push(`sm:grid-cols-${columns.sm}`);
    if (columns.md) colClasses.push(`md:grid-cols-${columns.md}`);
    if (columns.lg) colClasses.push(`lg:grid-cols-${columns.lg}`);

    return colClasses.join(' ');
  };

  const renderSingleCard = (item, index) => {
    if (!item) {
      console.warn('CardGrid: Skipping null/undefined item at index', index);
      return null;
    }

    const CardComponent = renderCard;

    if (!CardComponent) {
      console.error('CardGrid: No card component provided');
      return null;
    }

    return <CardComponent project={item} />;
  };

  const validData = data.filter(item => item != null);

  if (validData.length === 0) {
    return null;
  }

  return (
    <div
      className={`grid ${getGridClasses()} gap-${gap} items-start`}
      style={{
        alignItems: 'start',
      }}
    >
      {validData.map((item, index) => (
        <div
          key={item.id || `card-${index}`}
          onClick={() => handleCardClick(item)}
          className={`
            transform-gpu
            transition-all duration-200
            ${onCardClick ? 'cursor-pointer' : ''}
          `}
          style={{
            minHeight: 'fit-content',
          }}
        >
          {renderSingleCard(item, index)}
        </div>
      ))}
    </div>
  );
};

export default CardGrid;